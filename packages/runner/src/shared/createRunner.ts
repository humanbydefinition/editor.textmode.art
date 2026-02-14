import { startInIframe } from '@/core/bootstrap/startInIframe';
import { parseAllowedParentOrigins } from '@/core/security/allowedParentOrigins';

export interface BaseRunnerInterface {
	start(): void;
}

export type RunnerConstructor = new (allowedParentOrigins: Set<string>) => BaseRunnerInterface;

/**
 * Common boilerplate for initializing and starting a runner in an iframe.
 */
export function createRunner(RunnerClass: RunnerConstructor, debugWarningMessage: string) {
	const startRunner = () => {
		const allowedParentOriginsArray = parseAllowedParentOrigins(
			import.meta.env.VITE_RUNNER_PARENT_ORIGINS,
			import.meta.env.DEV
		);
		const allowedParentOrigins = new Set(allowedParentOriginsArray);

		const runner = new RunnerClass(allowedParentOrigins);

		startInIframe({
			start: () => runner.start(),
			isTopLevel: window.self === window.top,
			isDev: import.meta.env.DEV,
			search: window.location.search,
			hostname: window.location.hostname,
			allowedParentOrigins: allowedParentOriginsArray,
			productionFallbackUrl: 'https://synth.textmode.art',
			debugWarningMessage,
			onRedirect: (url) => {
				window.location.href = url;
			},
			onWarn: (message) => {
				console.warn(message);
			},
		});
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', startRunner);
	} else {
		startRunner();
	}
}
