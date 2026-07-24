import { createContext, useContext } from 'react';
import type { AppRuntime } from './AppRuntime';

/**
 * Context value provided by AppRuntime to the React tree.
 * Only contains stable action/layout references — runtime state
 * (editorBackdrop, audio input, etc.) is read from the Zustand store.
 */
export type AppRuntimeContextValue = Pick<AppRuntime, 'actions' | 'layout'>;

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function useAppRuntime(): AppRuntimeContextValue {
	const context = useContext(AppRuntimeContext);
	if (!context) {
		throw new Error('useAppRuntime must be used within an AppRuntimeContext.Provider');
	}
	return context;
}

export const AppRuntimeProvider = AppRuntimeContext.Provider;
