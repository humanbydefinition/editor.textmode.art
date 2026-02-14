import { describe, expect, it } from 'vitest';
import {
	decideTopLevelAccess,
	isTopLevelDebugAllowed,
	resolveTopLevelRedirectUrl,
} from '../src/core/bootstrap/startInIframe';

describe('startInIframe helpers', () => {
	it('allows non-top-level execution', () => {
		const decision = decideTopLevelAccess({
			isTopLevel: false,
			isDev: false,
			search: '',
			hostname: 'runner.test',
			allowedParentOrigins: ['https://client.test'],
			productionFallbackUrl: 'https://fallback.test',
			debugWarningMessage: 'debug',
		});

		expect(decision).toEqual({
			shouldStart: true,
			redirectUrl: null,
			debugWarning: null,
		});
	});

	it('allows top-level debug mode only in dev', () => {
		expect(isTopLevelDebugAllowed(true, '?debug')).toBe(true);
		expect(isTopLevelDebugAllowed(true, '?x=1')).toBe(false);
		expect(isTopLevelDebugAllowed(false, '?debug')).toBe(false);
	});

	it('resolves dev redirect to local client port', () => {
		expect(
			resolveTopLevelRedirectUrl({
				isDev: true,
				hostname: 'runner.test',
				allowedParentOrigins: ['https://client.test'],
				productionFallbackUrl: 'https://fallback.test',
			})
		).toBe('http://runner.test:5173');
	});

	it('resolves production redirect from first allowed parent origin', () => {
		expect(
			resolveTopLevelRedirectUrl({
				isDev: false,
				hostname: 'runner.test',
				allowedParentOrigins: ['https://client.test'],
				productionFallbackUrl: 'https://fallback.test',
			})
		).toBe('https://client.test');
	});

	it('falls back in production when no allowed parent origin exists', () => {
		expect(
			resolveTopLevelRedirectUrl({
				isDev: false,
				hostname: 'runner.test',
				allowedParentOrigins: [],
				productionFallbackUrl: 'https://fallback.test',
			})
		).toBe('https://fallback.test');
	});

	it('decides redirect for forbidden top-level access', () => {
		const decision = decideTopLevelAccess({
			isTopLevel: true,
			isDev: false,
			search: '',
			hostname: 'runner.test',
			allowedParentOrigins: ['https://client.test'],
			productionFallbackUrl: 'https://fallback.test',
			debugWarningMessage: 'debug',
		});

		expect(decision).toEqual({
			shouldStart: false,
			redirectUrl: 'https://client.test',
			debugWarning: null,
		});
	});
});
