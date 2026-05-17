import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/shared/ui/tooltip';
import { AnalyticsConsentBanner } from '@/features/analytics-consent';

const EditorApp = lazy(() =>
	import('@/app/EditorApp').then((m) => ({ default: m.EditorApp }))
);

/**
 * Root application component.
 * Loads the editor shell and analytics consent UI.
 */
export function App() {
	return (
		<TooltipProvider>
			<Suspense>
				<EditorApp />
			</Suspense>
			<AnalyticsConsentBanner />
		</TooltipProvider>
	);
}
