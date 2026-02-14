import { StrudelRunner } from './StrudelRunner';
import { startInIframe } from '@/core/bootstrap/startInIframe';
import { parseAllowedParentOrigins } from '@/core/security/allowedParentOrigins';

const runner = new StrudelRunner();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRunner);
} else {
    startRunner();
}

function startRunner(): void {
	const allowedParentOrigins = parseAllowedParentOrigins(
		import.meta.env.VITE_RUNNER_PARENT_ORIGINS,
		import.meta.env.DEV
	);

	startInIframe({
		start: () => runner.start(),
		isTopLevel: window.self === window.top,
		isDev: import.meta.env.DEV,
		search: window.location.search,
		hostname: window.location.hostname,
		allowedParentOrigins,
		productionFallbackUrl: 'https://synth.textmode.art',
		debugWarningMessage: 'Strudel runner is running in top-level window (debug mode).',
		onRedirect: (url) => {
			window.location.href = url;
		},
		onWarn: (message) => {
			console.warn(message);
		},
	});
}
