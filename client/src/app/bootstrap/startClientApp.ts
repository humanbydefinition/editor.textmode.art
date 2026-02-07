import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { AppRuntime } from '@/app';
import { AdminApp } from '@/admin/AdminApp';

/**
 * Boots either the main live-coding app or admin app based on the URL path.
 */
export function startClientApp(): void {
	document.addEventListener('DOMContentLoaded', () => {
		const adminPath = window.location.pathname.startsWith('/nest');
		const container = document.getElementById('app-container');
		if (!container) return;

		if (adminPath) {
			document.body.classList.add('admin-mode');
			const root = createRoot(container);
			root.render(createElement(AdminApp));
			return;
		}

		const app = new AppRuntime();
		void app.init();

		if (import.meta.env.DEV) {
			(window as unknown as { app: AppRuntime }).app = app;
		}
	});
}
