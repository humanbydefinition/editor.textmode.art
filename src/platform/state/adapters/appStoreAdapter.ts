import { useAppStore } from '../appStore';
import type { AppSettings, StatusState, CodeError } from '@/types';
import type { SharePayload } from '@/features/share/model/sharePayload';
import type { GallerySketch, GallerySketchSummary } from '@/features/gallery-sketches';
import type { AudioInputState } from '@/platform/state/slices/audioSlice';

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
	getRandomizeLoading: () => boolean;
	setRandomizeLoading: (value: boolean) => void;
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
}

/**
 * Adapter for accessing repository-backed gallery sketch state.
 */
export interface GalleryAdapter {
	getActiveSketch: () => GallerySketch | null;
	setActiveSketch: (sketch: GallerySketch | null) => void;
	getSketchSummary: () => GallerySketchSummary | null;
	setSketchSummary: (summary: GallerySketchSummary | null) => void;
	getOriginalSketch: () => GallerySketch | null;
	getOriginalSketchSummary: () => GallerySketchSummary | null;
	clearOriginalSketch: () => void;
}

/**
 * Adapter for accessing UI state.
 */
export interface UIAdapter {
	getIsMobile: () => boolean;
}

/**
 * Adapter for accessing external audio input state.
 */
export interface AudioAdapter {
	getInput: () => AudioInputState;
	setInput: (state: Partial<AudioInputState>) => void;
}

/**
 * Unified application store adapter.
 * Provides access to Zustand store state for non-React classes.
 */
export interface AppStoreAdapter {
	settings: SettingsAdapter;
	engine: EngineAdapter;
	share: ShareAdapter;
	gallery: GalleryAdapter;
	ui: UIAdapter;
	audio: AudioAdapter;
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
			getRandomizeLoading: () => getState().randomizeLoading,
			setRandomizeLoading: (value) => getState().setRandomizeLoading(value),
		},
		share: {
			getPayload: () => getState().share.payload,
			setPayload: (payload) => getState().setSharePayload(payload),
			getConsented: () => getState().share.consented,
			setConsented: (consented) => getState().setShareConsented(consented),
			getPromptOpen: () => getState().share.promptOpen,
			setPromptOpen: (open) => getState().setSharePromptOpen(open),
		},
		gallery: {
			getActiveSketch: () => getState().gallerySketch,
			setActiveSketch: (sketch) => getState().setGallerySketch(sketch),
			getSketchSummary: () => getState().gallerySketchSummary,
			setSketchSummary: (summary) => getState().setGallerySketchSummary(summary),
			getOriginalSketch: () => getState().originalGallerySketch,
			getOriginalSketchSummary: () => getState().originalGallerySketchSummary,
			clearOriginalSketch: () => getState().clearOriginalGallerySketch(),
		},
		ui: {
			getIsMobile: () => getState().isMobile,
		},
		audio: {
			getInput: () => getState().audioInput,
			setInput: (state) => getState().setAudioInput(state),
		},
	};
};
