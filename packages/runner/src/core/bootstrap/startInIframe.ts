import { getFirstAllowedParentOrigin } from '@/core/security/allowedParentOrigins';

interface RedirectOptions {
	isDev: boolean;
	hostname: string;
	allowedParentOrigins: string[];
	productionFallbackUrl: string;
}

export function resolveTopLevelRedirectUrl(options: RedirectOptions): string {
	if (options.isDev) {
		return `http://${options.hostname}:5180`;
	}

	return getFirstAllowedParentOrigin(options.allowedParentOrigins) ?? options.productionFallbackUrl;
}

export function isTopLevelDebugAllowed(isDev: boolean, search: string): boolean {
	if (!isDev) return false;
	return new URLSearchParams(search).has('debug');
}

interface TopLevelAccessDecisionOptions extends RedirectOptions {
	isTopLevel: boolean;
	search: string;
	debugWarningMessage: string;
}

export interface TopLevelAccessDecision {
	shouldStart: boolean;
	redirectUrl: string | null;
	debugWarning: string | null;
}

export function decideTopLevelAccess(options: TopLevelAccessDecisionOptions): TopLevelAccessDecision {
	if (!options.isTopLevel) {
		return {
			shouldStart: true,
			redirectUrl: null,
			debugWarning: null,
		};
	}

	if (isTopLevelDebugAllowed(options.isDev, options.search)) {
		return {
			shouldStart: true,
			redirectUrl: null,
			debugWarning: options.debugWarningMessage,
		};
	}

	return {
		shouldStart: false,
		redirectUrl: resolveTopLevelRedirectUrl(options),
		debugWarning: null,
	};
}

interface StartInIframeOptions extends TopLevelAccessDecisionOptions {
	start: () => void;
	onRedirect: (url: string) => void;
	onWarn: (message: string) => void;
}

export function startInIframe(options: StartInIframeOptions): void {
	const decision = decideTopLevelAccess(options);

	if (decision.debugWarning) {
		options.onWarn(decision.debugWarning);
	}

	if (!decision.shouldStart && decision.redirectUrl) {
		options.onRedirect(decision.redirectUrl);
		return;
	}

	options.start();
}
