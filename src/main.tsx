import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { initializeGoogleAnalytics } from '@/features/analytics-consent/model/analytics-consent';

initializeGoogleAnalytics();

const container = document.getElementById('app-container');
if (container) {
	createRoot(container).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
}
