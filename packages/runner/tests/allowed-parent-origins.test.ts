import { describe, expect, it } from 'vitest';
import { getFirstAllowedParentOrigin, parseAllowedParentOrigins } from '../src/core/security/allowedParentOrigins';

describe('allowedParentOrigins', () => {
	it('returns wildcard in dev when env var is missing', () => {
		expect(parseAllowedParentOrigins(undefined, true)).toEqual(['*']);
	});

	it('returns empty list in production when env var is missing', () => {
		expect(parseAllowedParentOrigins(undefined, false)).toEqual([]);
	});

	it('parses and trims comma-separated origins', () => {
		expect(parseAllowedParentOrigins(' https://a.test , https://b.test ', false)).toEqual([
			'https://a.test',
			'https://b.test',
		]);
	});

	it('falls back to wildcard in dev when value is empty', () => {
		expect(parseAllowedParentOrigins('  ,  ', true)).toEqual(['*']);
	});

	it('returns first origin or null', () => {
		expect(getFirstAllowedParentOrigin(['https://a.test', 'https://b.test'])).toBe('https://a.test');
		expect(getFirstAllowedParentOrigin([])).toBeNull();
	});
});
