/**
 * Service for interacting with the sketch API.
 * Handles fetching approved sketches and submitting publish requests.
 */

import type {
    AntiSpamChallenge,
    AntiSpamProof,
    ApprovedSketch,
    PublicSketchAccess,
    SketchRequestPayload,
    SketchRequestResult,
    SketchSubmissionQueueStatus,
    SlugAvailabilityResult,
    SketchRequestHashPayload,
} from '@synth.textmode.art/contracts/sketch';
import {
    serializeSketchRequestForAntiSpam,
    toSketchRequestHashPayload,
} from '@synth.textmode.art/contracts/sketch';

const POW_ALGORITHM = 'sha256-leading-zero-bits-v1';
const POW_MAX_NONCE = 3_000_000;
const POW_YIELD_INTERVAL = 250;

function getApiBase(): string {
    const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    if (envBase?.trim()) {
        return envBase.replace(/\/$/, '');
    }

    // Default to same-origin so Vite dev proxy (/api) also works from real mobile devices.
    return '';
}

/**
 * Fetch an approved sketch by slug.
 * Returns null if not found or not approved.
 */
export async function fetchApprovedSketch(slug: string): Promise<ApprovedSketch | null> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketches/${encodeURIComponent(slug)}`);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as ApprovedSketch;
    } catch {
        console.warn(`[SketchApiService] Failed to fetch sketch: ${slug}`);
        return null;
    }
}

/**
 * Fetch a slug-access sketch payload (approved or pending).
 * Returns null if not found.
 */
export async function fetchSketchBySlugAccess(slug: string): Promise<PublicSketchAccess | null> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketches/${encodeURIComponent(slug)}/access`);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as PublicSketchAccess;
    } catch {
        console.warn(`[SketchApiService] Failed to fetch slug access sketch: ${slug}`);
        return null;
    }
}

/**
 * Fetch a random approved sketch.
 * Optionally exclude a specific slug from selection.
 */
export async function fetchRandomApprovedSketch(excludeSlug?: string): Promise<ApprovedSketch | null> {
    try {
        const query = excludeSlug
            ? `?excludeSlug=${encodeURIComponent(excludeSlug)}`
            : '';
        const response = await fetch(`${getApiBase()}/api/sketches/random${query}`);
        if (!response.ok) {
            return null;
        }
        return (await response.json()) as ApprovedSketch;
    } catch {
        console.warn('[SketchApiService] Failed to fetch random sketch');
        return null;
    }
}

/**
 * Check if a slug is available for use.
 */
export async function checkSlugAvailability(slug: string): Promise<SlugAvailabilityResult> {
    try {
        const response = await fetch(
            `${getApiBase()}/api/sketch-requests/slug-available?slug=${encodeURIComponent(slug)}`
        );
        if (!response.ok) {
            return { available: false, slug, reason: 'Failed to check availability' };
        }
        return (await response.json()) as SlugAvailabilityResult;
    } catch {
        return { available: false, slug, reason: 'Network error' };
    }
}

/**
 * Fetch current gallery submission queue status.
 */
export async function fetchSketchSubmissionQueueStatus(): Promise<SketchSubmissionQueueStatus | null> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketch-requests/queue-status`, {
            cache: 'no-store',
        });
        if (!response.ok) {
            return null;
        }

        return (await response.json()) as SketchSubmissionQueueStatus;
    } catch {
        return null;
    }
}

/**
 * Submit a new sketch request for moderation.
 */
export async function submitSketchRequest(
    payload: Omit<SketchRequestPayload, 'antiSpam'>
): Promise<{ success: true; data: SketchRequestResult } | { success: false; error: string }> {
    try {
        const antiSpamProof = await buildAntiSpamProof(payload);
        if (!antiSpamProof) {
            return { success: false, error: 'Unable to complete anti-spam verification. Please try again.' };
        }

        const response = await fetch(`${getApiBase()}/api/sketch-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-idempotency-key': generateIdempotencyKey(),
            },
            body: JSON.stringify({ ...payload, antiSpam: antiSpamProof }),
        });

        if (!response.ok) {
            const errorData = (await response.json().catch(() => ({}))) as { error?: string };
            return { success: false, error: errorData.error || `Request failed: ${response.status}` };
        }

        const data = (await response.json()) as SketchRequestResult;
        return { success: true, data };
    } catch {
        return { success: false, error: 'Network error' };
    }
}

type AntiSpamChallengeResponse = AntiSpamChallenge;

async function fetchAntiSpamChallenge(): Promise<AntiSpamChallengeResponse | null> {
    try {
        const response = await fetch(`${getApiBase()}/api/sketch-requests/challenge`);
        if (!response.ok) {
            return null;
        }

        return (await response.json()) as AntiSpamChallengeResponse;
    } catch {
        return null;
    }
}

function generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().replace(/-/g, '');
    }
    return `${Date.now()}${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 32);
}

async function buildAntiSpamProof(payload: Omit<SketchRequestPayload, 'antiSpam'>): Promise<AntiSpamProof | null> {
    const challenge = await fetchAntiSpamChallenge();
    if (!challenge) return null;
    if (challenge.algorithm !== POW_ALGORITHM) return null;

    const payloadForHash = toSketchRequestHashPayload(payload) satisfies SketchRequestHashPayload;
    const payloadHash = await sha256Hex(serializeSketchRequestForAntiSpam(payloadForHash));

    const nonce = await solveProofOfWork(challenge, payloadHash);
    if (!nonce) return null;

    return {
        algorithm: POW_ALGORITHM,
        challengeId: challenge.challengeId,
        nonce,
        payloadHash,
        token: challenge.token,
    };
}

async function solveProofOfWork(challenge: AntiSpamChallenge, payloadHash: string): Promise<string | null> {
    const now = Date.now();
    const challengeExpiry = Date.parse(challenge.expiresAt);
    if (!Number.isFinite(challengeExpiry) || challengeExpiry <= now) {
        return null;
    }

    for (let nonce = 0; nonce < POW_MAX_NONCE; nonce += 1) {
        if (Date.now() >= challengeExpiry) {
            return null;
        }

        const digest = await sha256Bytes(`${challenge.challengeId}:${payloadHash}:${nonce}`);
        if (hasLeadingZeroBits(digest, challenge.difficulty)) {
            return String(nonce);
        }

        if (nonce > 0 && nonce % POW_YIELD_INTERVAL === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    }

    return null;
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
    const encoded = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return new Uint8Array(digest);
}

async function sha256Hex(input: string): Promise<string> {
    const digest = await sha256Bytes(input);
    return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hasLeadingZeroBits(bytes: Uint8Array, bits: number): boolean {
    const fullBytes = Math.floor(bits / 8);
    const remainderBits = bits % 8;

    for (let i = 0; i < fullBytes; i += 1) {
        if (bytes[i] !== 0) return false;
    }

    if (remainderBits === 0) {
        return true;
    }

    const mask = 0xff << (8 - remainderBits);
    return (bytes[fullBytes] & mask) === 0;
}
