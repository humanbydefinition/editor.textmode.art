import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AntiSpamChallenge, SketchRequestPayload } from '@synth.textmode.art/contracts/sketch';
import { serializeSketchRequestForAntiSpam, toSketchRequestHashPayload } from '@synth.textmode.art/contracts/sketch';

interface NoPiiAntiSpamGuardOptions {
  secret: string;
  difficulty: number;
  challengeTtlMs: number;
  maxChallengesPerMinute: number;
  maxSubmissionsPerMinute: number;
  idempotencyTtlMs: number;
}

export interface GuardError {
  statusCode: number;
  error: string;
}

export interface GuardSuccess {
  ok: true;
}

type GuardResult = GuardSuccess | GuardError;

interface ChallengeTokenPayload {
  v: 1;
  algorithm: 'sha256-leading-zero-bits-v1';
  challengeId: string;
  difficulty: number;
  expiresAt: number;
}

class SlidingWindowLimiter {
  private readonly windowMs: number;
  private readonly maxEvents: number;
  private readonly events: number[] = [];

  constructor(windowMs: number, maxEvents: number) {
    this.windowMs = windowMs;
    this.maxEvents = maxEvents;
  }

  tryConsume(now: number): boolean {
    this.prune(now);
    if (this.events.length >= this.maxEvents) {
      return false;
    }
    this.events.push(now);
    return true;
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.events.length > 0 && this.events[0] < cutoff) {
      this.events.shift();
    }
  }
}

function toHex(buffer: Uint8Array): string {
  return Buffer.from(buffer).toString('hex');
}

function hasLeadingZeroBits(bytes: Uint8Array, bits: number): boolean {
  const fullBytes = Math.floor(bits / 8);
  const remainderBits = bits % 8;

  for (let i = 0; i < fullBytes; i += 1) {
    if (bytes[i] !== 0) {
      return false;
    }
  }

  if (remainderBits === 0) {
    return true;
  }

  const mask = 0xff << (8 - remainderBits);
  return (bytes[fullBytes] & mask) === 0;
}

function safeEqualHexString(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export class NoPiiAntiSpamGuard {
  private readonly options: NoPiiAntiSpamGuardOptions;
  private readonly challengeLimiter: SlidingWindowLimiter;
  private readonly submissionLimiter: SlidingWindowLimiter;
  private readonly consumedChallengeExpiries = new Map<string, number>();
  private readonly consumedIdempotencyKeyExpiries = new Map<string, number>();

  constructor(options: NoPiiAntiSpamGuardOptions) {
    this.options = options;
    this.challengeLimiter = new SlidingWindowLimiter(60_000, options.maxChallengesPerMinute);
    this.submissionLimiter = new SlidingWindowLimiter(60_000, options.maxSubmissionsPerMinute);
  }

  issueChallenge(now = Date.now()): AntiSpamChallenge | GuardError {
    this.pruneState(now);
    if (!this.challengeLimiter.tryConsume(now)) {
      return {
        statusCode: 429,
        error: 'Challenge rate limit exceeded. Please try again shortly.',
      };
    }

    const challengeId = randomBytes(16).toString('hex');
    const expiresAt = now + this.options.challengeTtlMs;
    const tokenPayload: ChallengeTokenPayload = {
      v: 1,
      algorithm: 'sha256-leading-zero-bits-v1',
      challengeId,
      difficulty: this.options.difficulty,
      expiresAt,
    };

    const token = this.signChallengeToken(tokenPayload);

    return {
      algorithm: 'sha256-leading-zero-bits-v1',
      challengeId,
      difficulty: this.options.difficulty,
      expiresAt: new Date(expiresAt).toISOString(),
      token,
    };
  }

  verifyAndConsumeSubmissionProof(payload: SketchRequestPayload, now = Date.now()): GuardResult {
    this.pruneState(now);

    const tokenPayload = this.verifyChallengeToken(payload.antiSpam.token);
    if (!tokenPayload) {
      return { statusCode: 400, error: 'Invalid anti-spam token.' };
    }

    if (tokenPayload.algorithm !== payload.antiSpam.algorithm) {
      return { statusCode: 400, error: 'Invalid anti-spam algorithm.' };
    }

    if (!safeEqualHexString(tokenPayload.challengeId, payload.antiSpam.challengeId)) {
      return { statusCode: 400, error: 'Anti-spam challenge mismatch.' };
    }

    if (tokenPayload.expiresAt <= now) {
      return { statusCode: 400, error: 'Anti-spam challenge expired. Please request a new one.' };
    }

    if (this.consumedChallengeExpiries.has(tokenPayload.challengeId)) {
      return { statusCode: 409, error: 'Anti-spam challenge already used. Please request a new one.' };
    }

    const expectedPayloadHash = this.computePayloadHash(payload);
    if (!safeEqualHexString(expectedPayloadHash, payload.antiSpam.payloadHash)) {
      return { statusCode: 400, error: 'Anti-spam payload hash mismatch.' };
    }

    const nonce = Number(payload.antiSpam.nonce);
    if (!Number.isInteger(nonce) || nonce < 0) {
      return { statusCode: 400, error: 'Invalid anti-spam nonce.' };
    }

    const input = `${tokenPayload.challengeId}:${expectedPayloadHash}:${payload.antiSpam.nonce}`;
    const digest = createHash('sha256').update(input).digest();
    if (!hasLeadingZeroBits(digest, tokenPayload.difficulty)) {
      return { statusCode: 400, error: 'Anti-spam proof verification failed.' };
    }

    if (!this.submissionLimiter.tryConsume(now)) {
      return {
        statusCode: 429,
        error: 'Submission rate limit reached. Please try again in a moment.',
      };
    }

    this.consumedChallengeExpiries.set(tokenPayload.challengeId, tokenPayload.expiresAt);
    return { ok: true };
  }

  consumeIdempotencyKey(key: string, now = Date.now()): GuardResult {
    this.pruneState(now);
    if (this.consumedIdempotencyKeyExpiries.has(key)) {
      return {
        statusCode: 409,
        error: 'Duplicate submission detected. Please retry with a new request.',
      };
    }

    this.consumedIdempotencyKeyExpiries.set(key, now + this.options.idempotencyTtlMs);
    return { ok: true };
  }

  private computePayloadHash(payload: SketchRequestPayload): string {
    const hashPayload = toSketchRequestHashPayload(payload);
    const serialized = serializeSketchRequestForAntiSpam(hashPayload);
    const digest = createHash('sha256').update(serialized, 'utf8').digest();
    return toHex(digest);
  }

  private signChallengeToken(payload: ChallengeTokenPayload): string {
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', this.options.secret).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  private verifyChallengeToken(token: string): ChallengeTokenPayload | null {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return null;
    }

    const [encodedPayload, signature] = parts;
    const expectedSignature = createHmac('sha256', this.options.secret).update(encodedPayload).digest('base64url');
    if (!safeEqualHexString(expectedSignature, signature)) {
      return null;
    }

    try {
      const decodedJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const parsed = JSON.parse(decodedJson) as Partial<ChallengeTokenPayload>;
      if (
        parsed.v !== 1 ||
        parsed.algorithm !== 'sha256-leading-zero-bits-v1' ||
        typeof parsed.challengeId !== 'string' ||
        !/^[a-f0-9]{32}$/.test(parsed.challengeId) ||
        typeof parsed.difficulty !== 'number' ||
        !Number.isInteger(parsed.difficulty) ||
        parsed.difficulty < 8 ||
        parsed.difficulty > 24 ||
        typeof parsed.expiresAt !== 'number'
      ) {
        return null;
      }

      return {
        v: 1,
        algorithm: parsed.algorithm,
        challengeId: parsed.challengeId,
        difficulty: parsed.difficulty,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      return null;
    }
  }

  private pruneState(now: number): void {
    for (const [challengeId, expiresAt] of this.consumedChallengeExpiries) {
      if (expiresAt <= now) {
        this.consumedChallengeExpiries.delete(challengeId);
      }
    }

    for (const [key, expiresAt] of this.consumedIdempotencyKeyExpiries) {
      if (expiresAt <= now) {
        this.consumedIdempotencyKeyExpiries.delete(key);
      }
    }
  }
}

