import type { SharePayload } from '@/types/share.types';

const SHARE_HASH_KEY = 'share';
const SHARE_QUERY_KEY = 'share';
const MAX_DECODED_CHARS = 300_000;

function base64UrlEncode(input: string): string {
	const bytes = new TextEncoder().encode(input);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
	const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
	const binary = atob(padded);
	const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
	return new TextDecoder().decode(bytes);
}

function isSharePayload(value: unknown): value is SharePayload {
	if (!value || typeof value !== 'object') return false;
	const payload = value as SharePayload;
	if (payload.v !== 1) return false;
	if (typeof payload.createdAt !== 'number') return false;
	if (!payload.engines || typeof payload.engines !== 'object') return false;
	return true;
}

export class ShareService {
	static encode(payload: SharePayload): string {
		const json = JSON.stringify(payload);
		return base64UrlEncode(json);
	}

	static decode(raw: string): SharePayload | null {
		try {
			const decoded = base64UrlDecode(raw);
			if (decoded.length > MAX_DECODED_CHARS) return null;
			const parsed = JSON.parse(decoded) as unknown;
			if (!isSharePayload(parsed)) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	static getFromLocation(location: Location): SharePayload | null {
		const hash = location.hash.replace(/^#/, '');
		if (hash) {
			const params = new URLSearchParams(hash);
			const value = params.get(SHARE_HASH_KEY);
			if (value) return ShareService.decode(value);
		}

		const search = location.search.replace(/^\?/, '');
		if (search) {
			const params = new URLSearchParams(search);
			const value = params.get(SHARE_QUERY_KEY);
			if (value) return ShareService.decode(value);
		}

		return null;
	}
}
