import { useEffect, useRef } from 'react';
import { AppRuntime } from '@/app/runtime/AppRuntime';
import { AppShell } from '@/app/ui/AppShell';

/**
 * React wrapper that owns the AppRuntime lifecycle.
 * Creates the runtime once, initializes on mount, disposes on unmount,
 * and passes stable actions/layout references as props to AppShell.
 */
export function EditorApp() {
	const runtimeRef = useRef<AppRuntime | null>(null);

	if (!runtimeRef.current) {
		runtimeRef.current = new AppRuntime();
	}

	const runtime = runtimeRef.current;

	useEffect(() => {
		runtime.init();

		if (import.meta.env.DEV) {
			(window as unknown as Record<string, unknown>).app = runtime;
		}

		return () => {
			runtime.dispose();

			if (import.meta.env.DEV) {
				delete (window as unknown as Record<string, unknown>).app;
			}
		};
	}, [runtime]);

	return <AppShell actions={runtime.actions} layout={runtime.layout} />;
}
