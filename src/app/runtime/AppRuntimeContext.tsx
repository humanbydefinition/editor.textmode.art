import { createContext, useContext } from 'react';
import type { ShareExportData } from '@/features/share';

/**
 * Context value provided by AppRuntime to the React tree.
 * Only contains stable action/layout references — runtime state
 * (randomizeLoading, editorBackdrop, etc.) is read from the Zustand store.
 */
export interface AppRuntimeContextValue {
	actions: {
		randomize: () => Promise<boolean>;
		makeRandomChange: () => void;
		resetRunners: () => void;
		clearStorage: () => void;
		loadExample: (code: string) => void;
		revertToLastWorking: () => void;
		reconnectTextmodeRunner: () => void;
		enableAudioInput: (deviceId?: string) => Promise<void>;
		disableAudioInput: () => void;
		refreshAudioInputDevices: () => Promise<void>;
		selectAudioInputDevice: (deviceId: string) => Promise<void>;

		// Share / Export
		unlockAndRun: () => void;
		unlockOnly: () => void;
		discardShare: () => void;
		openSharePrompt: () => void;
		keepShareLocked: () => void;

		copyShareExportUrl: (url: string) => void;

		getShareExportData: () => ShareExportData;
	};

	layout: {
		onTextmodeReady: (container: HTMLElement) => void;
	};
}

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function useAppRuntime(): AppRuntimeContextValue {
	const context = useContext(AppRuntimeContext);
	if (!context) {
		throw new Error('useAppRuntime must be used within an AppRuntimeContext.Provider');
	}
	return context;
}

export const AppRuntimeProvider = AppRuntimeContext.Provider;
