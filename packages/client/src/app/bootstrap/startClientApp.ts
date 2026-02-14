import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { AppRuntime } from '@/app/runtime/AppRuntime';
import { AdminApp } from '@/features/admin';
import { ensureMonacoClipboardCompatibility } from '@/platform/compat/monacoClipboardShim';

interface RuntimeWindow extends Window {
	__synthBootStarted__?: boolean;
	__synthAppRuntime__?: AppRuntime;
	__synthAdminRoot__?: Root;
	app?: AppRuntime;
}

/**
 * Boots either the main live-coding app or admin app based on the URL path.
 */
export function startClientApp(): void {
	ensureMonacoClipboardCompatibility();

	const runtimeWindow = window as RuntimeWindow;
	if (runtimeWindow.__synthBootStarted__) return;
	runtimeWindow.__synthBootStarted__ = true;

	const boot = (): void => {
		const adminPath = window.location.pathname.startsWith('/nest');
		const container = document.getElementById('app-container');
		if (!container) return;

		if (adminPath) {
			runtimeWindow.__synthAppRuntime__?.dispose();
			runtimeWindow.__synthAppRuntime__ = undefined;

			document.body.classList.add('admin-mode');
			const root = createRoot(container);
			runtimeWindow.__synthAdminRoot__ = root;
			root.render(createElement(AdminApp));
			return;
		}

		runtimeWindow.__synthAdminRoot__?.unmount();
		runtimeWindow.__synthAdminRoot__ = undefined;
		document.body.classList.remove('admin-mode');

		runtimeWindow.__synthAppRuntime__?.dispose();
		const app = new AppRuntime();
		runtimeWindow.__synthAppRuntime__ = app;
		void app.init();

		if (import.meta.env.DEV) {
			runtimeWindow.app = app;
		}
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', boot, { once: true });
		return;
	}

	boot();
}
