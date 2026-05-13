import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';

const container = document.getElementById('app-container');
if (container) {
	createRoot(container).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
}
