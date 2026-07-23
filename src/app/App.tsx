import { lazy, Suspense } from 'react';
import { TooltipProvider } from '@/shared/ui/tooltip';

const EditorApp = lazy(() => import('@/app/EditorApp').then((m) => ({ default: m.EditorApp })));

/**
 * Root application component.
 * Loads the editor shell.
 */
export function App() {
	return (
		<TooltipProvider>
			<Suspense>
				<EditorApp />
			</Suspense>
		</TooltipProvider>
	);
}
