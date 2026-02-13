import { StrudelRunner } from './StrudelRunner';

const runner = new StrudelRunner();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRunner);
} else {
    startRunner();
}

function startRunner(): void {
    if (window.self === window.top) {
        const isDev = import.meta.env.DEV;
        const isDebug = new URLSearchParams(window.location.search).has('debug');

        if (isDev && isDebug) {
            console.warn('Strudel runner is running in top-level window (debug mode).');
        } else {
            const origins = import.meta.env.VITE_RUNNER_PARENT_ORIGINS;
            const firstOrigin =
                origins && typeof origins === 'string' && origins.length > 0
                    ? (origins.split(',')[0]?.trim() ?? null)
                    : null;
            const redirectUrl = isDev
                ? `http://${window.location.hostname}:5173`
                : firstOrigin || 'https://synth.textmode.art';
            window.location.href = redirectUrl;
            return;
        }
    }

    runner.start();
}
