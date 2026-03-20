import { useAppStore } from '../appStore';
import type { AppSettings, StatusState, CodeError } from '@/types';
import type { ApprovedSketch } from '@synth.textmode.art/contracts/sketch';
import type { SharePayload } from '@synth.textmode.art/contracts/share';
import type { SketchSummary } from '@/features/sketch-meta';

/**
 * Adapter for accessing settings state.
 */
export interface SettingsAdapter {
	getSettings: () => AppSettings;
	setSettings: (settings: AppSettings) => void;
}

/**
 * Adapter for accessing engine state.
 */
export interface EngineAdapter {
	getStatus: () => StatusState;
	setStatus: (status: StatusState) => void;
	getError: () => CodeError | null;
	setError: (error: CodeError | null) => void;
	clearError: () => void;
	getLastWorkingCode: () => string | null;
	setLastWorkingCode: (code: string | null) => void;
	getPendingWorkingCode: () => string | null;
	setPendingWorkingCode: (code: string) => void;
	cancelPendingWorkingCode: () => void;
	setIsInitialized: (isInitialized: boolean) => void;
	setRunnerUnavailable: (value: boolean) => void;
	setRunnerReconnecting: (value: boolean) => void;
	setRunnerReady: (value: boolean) => void;
}

/**
 * Adapter for accessing share state.
 */
export interface ShareAdapter {
	getPayload: () => SharePayload | null;
	setPayload: (payload: SharePayload | null) => void;
	getConsented: () => boolean;
	setConsented: (consented: boolean) => void;
	getPromptOpen: () => boolean;
	setPromptOpen: (open: boolean) => void;
	clearOriginalApprovedSketch: () => void;
	getApprovedSketch: () => ApprovedSketch | null;
	setApprovedSketch: (sketch: ApprovedSketch | null) => void;
	getSketchSummary: () => SketchSummary | null;
	setSketchSummary: (info: SketchSummary | null) => void;
	getOriginalApprovedSketch: () => ApprovedSketch | null;
	getOriginalSketchSummary: () => SketchSummary | null;
}

/**
 * Adapter for accessing UI state.
 */
export interface UIAdapter {
	getIsMobile: () => boolean;
}

/**
 * Unified application store adapter.
 * Provides access to Zustand store state for non-React classes.
 */
export interface AppStoreAdapter {
	settings: SettingsAdapter;
	engine: EngineAdapter;
	share: ShareAdapter;
	ui: UIAdapter;
}

/**
 * Create a unified store adapter.
 */
export const createAppStoreAdapter = (): AppStoreAdapter => {
	const getState = () => useAppStore.getState();

	return {
		settings: {
			getSettings: () => getState().settings,
			setSettings: (settings) => getState().setSettings(settings),
		},
		engine: {
			getStatus: () => getState().status,
			setStatus: (status) => getState().setStatus(status),
			getError: () => getState().error,
			setError: (error) => getState().setError(error),
			clearError: () => getState().clearError(),
			getLastWorkingCode: () => getState().lastWorkingCode,
			setLastWorkingCode: (code) => getState().setLastWorkingCode(code),
			getPendingWorkingCode: () => getState().pendingWorkingCode,
			setPendingWorkingCode: (code) => getState().setPendingWorkingCode(code),
			cancelPendingWorkingCode: () => getState().cancelPendingWorkingCode(),
			setIsInitialized: (isInitialized) => getState().setIsInitialized(isInitialized),
			setRunnerUnavailable: (value) => getState().setRunnerUnavailable(value),
			setRunnerReconnecting: (value) => getState().setRunnerReconnecting(value),
			setRunnerReady: (value) => getState().setRunnerReady(value),
		},
		share: {
			getPayload: () => getState().share.payload,
			setPayload: (payload) => getState().setSharePayload(payload),
			getConsented: () => getState().share.consented,
			setConsented: (consented) => getState().setShareConsented(consented),
			getPromptOpen: () => getState().share.promptOpen,
			setPromptOpen: (open) => getState().setSharePromptOpen(open),
			clearOriginalApprovedSketch: () => getState().clearOriginalApprovedSketch(),
			getApprovedSketch: () => getState().approvedSketch,
			setApprovedSketch: (sketch) => getState().setApprovedSketch(sketch),
			getSketchSummary: () => getState().sketchSummary,
			setSketchSummary: (info) => getState().setSketchSummary(info),
			getOriginalApprovedSketch: () => getState().originalApprovedSketch,
			getOriginalSketchSummary: () => getState().originalSketchSummary,
		},
		ui: {
			getIsMobile: () => getState().isMobile,
		},
	};
};
