/**
 * Entry point for the Textmode runner iframe.
 */
import { TextmodeRunner } from './TextmodeRunner';

const runner = new TextmodeRunner();

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startRunner);
} else {
    startRunner();
}

function startRunner() {
    // Security: Redirect if accessed directly (not in iframe)
    if (window.self === window.top) {
        // Allow direct access in dev only if explicitly requested
        const isDev = import.meta.env.DEV;
        const isDebug = new URLSearchParams(window.location.search).has('debug');

        if (isDev && isDebug) {
            console.warn('Runner is running in top-level window (debug mode).');
        } else {
            // Redirect to main app (derived from allowed parent origins, or fallback)
            const origins = import.meta.env.VITE_RUNNER_PARENT_ORIGINS;
            const firstOrigin =
                origins && typeof origins === 'string'
                    ? origins.split(',')[0].trim()
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
