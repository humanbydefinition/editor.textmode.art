import type { SharePayload } from '@synth.textmode.art/contracts/share';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

const SHARE_HASH_KEY = 'share';
const SHARE_QUERY_KEY = 'share';
const MAX_DECODED_CHARS = 300_000;

export const MAX_SHARE_URL_LENGTH = 4096;

function isSharePayload(value: unknown): value is SharePayload {
	if (!value || typeof value !== 'object') return false;
	const payload = value as SharePayload;
	if (payload.v !== 1) return false;
	if (typeof payload.createdAt !== 'number') return false;
	if (!payload.engines || typeof payload.engines !== 'object') return false;
	if (payload.engines.textmode !== undefined && typeof payload.engines.textmode !== 'string') return false;
	return true;
}

export class ShareService {
	static encode(payload: SharePayload): string {
		const json = JSON.stringify(payload);
		const compressed = compressToEncodedURIComponent(json);
		return compressed;
	}

	static buildShareUrl(payload: SharePayload, location: Location): string {
		const encoded = ShareService.encode(payload);
		// Always use root path to prevent share URLs from inheriting slug paths.
		// This ensures lz-string encoded sketches always go through the consent dialog.
		return `${location.origin}/#${SHARE_HASH_KEY}=${encoded}`;
	}

	static decode(raw: string): SharePayload | null {
		try {
			const decoded = decompressFromEncodedURIComponent(raw);
			if (!decoded) return null;
			if (decoded.length > MAX_DECODED_CHARS) return null;
			const parsed = JSON.parse(decoded) as unknown;
			return isSharePayload(parsed) ? parsed : null;
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
