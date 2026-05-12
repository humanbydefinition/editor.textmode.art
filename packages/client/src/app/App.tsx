import { lazy, Suspense, useEffect } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { TooltipProvider } from '@/shared/ui/tooltip';

const EditorApp = lazy(() =>
	import('@/app/EditorApp').then((m) => ({ default: m.EditorApp }))
);
const LegalDocumentPage = lazy(() =>
	import('@/features/legal').then((m) => ({ default: m.LegalDocumentPage }))
);
const LegalContactPage = lazy(() =>
	import('@/features/legal').then((m) => ({ default: m.LegalContactPage }))
);

/**
 * Root application component.
 * Uses wouter for client-side routing between the editor and legal pages.
 * Legal code is lazy-loaded so it doesn't bloat the editor bundle.
 */
export function App() {
	const [location] = useLocation();

	return (
		<TooltipProvider>
				<Suspense>
					<Switch>
					<Route path="/imprint">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="imprint" />
						</RouteMode>
					</Route>
					<Route path="/tos">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="terms" />
						</RouteMode>
					</Route>
					<Route path="/privacy">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="privacy" />
						</RouteMode>
					</Route>
					<Route path="/contact">
						<RouteMode className="legal-mode">
							<LegalContactPage />
						</RouteMode>
					</Route>

					{/* Locale-prefixed legal routes (/en/imprint, /de/tos, etc.) */}
					<Route path="/:locale/imprint">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="imprint" />
						</RouteMode>
					</Route>
					<Route path="/:locale/tos">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="terms" />
						</RouteMode>
					</Route>
					<Route path="/:locale/privacy">
						<RouteMode className="legal-mode">
							<LegalDocumentPage documentId="privacy" />
						</RouteMode>
					</Route>
					<Route path="/:locale/contact">
						<RouteMode className="legal-mode">
							<LegalContactPage />
						</RouteMode>
					</Route>

					{/* Default: editor (handles / and any unmatched path) */}
					<Route>
						<EditorApp key={location} />
					</Route>
				</Switch>
			</Suspense>
		</TooltipProvider>
	);
}

/**
 * Sets a CSS class on <body> while the route is active, and removes it on unmount.
 * Replaces the old imperative body.classList toggling in startClientApp.
 */
function RouteMode({ className, children }: { className: string; children: React.ReactNode }) {
	useEffect(() => {
		document.body.classList.add(className);
		return () => {
			document.body.classList.remove(className);
		};
	}, [className]);

	return <>{children}</>;
}
