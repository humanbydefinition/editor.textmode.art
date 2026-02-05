import './styles/index.css';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { AdminApp } from './admin/AdminApp';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
	const adminPath = window.location.pathname.startsWith('/admin');
	const container = document.getElementById('app-container');
	if (!container) return;

	if (adminPath) {
		document.body.classList.add('admin-mode');
		const root = createRoot(container);
		root.render(<AdminApp />);
		return;
	}

	const app = new App();
	app.init();

	// Expose for debugging in dev mode
	if (import.meta.env.DEV) {
		(window as unknown as { app: App }).app = app;
	}
});
