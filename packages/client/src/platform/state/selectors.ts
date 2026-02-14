import type { AppState } from '@/platform/state/appStore';

export const selectSettings = (state: AppState) => state.settings;
export const selectShareState = (state: AppState) => state.share;
export const selectError = (state: AppState) => state.error;
export const selectIsMobile = (state: AppState) => state.isMobile;
export const selectActivePanel = (state: AppState) => state.activePanel;
export const selectPanels = (state: AppState) => state.panels;
export const selectApprovedSketch = (state: AppState) => state.approvedSketch;
export const selectSlugSketchInfo = (state: AppState) => state.slugSketchInfo;
export const selectStrudelEnabled = (state: AppState) => state.settings.strudelEnabled;
export const selectStrudelTransport = (state: AppState) => state.settings.strudelTransport;
export const selectTextmodeRunnerUnavailable = (state: AppState): boolean =>
	state.engineStates.textmode?.customState.runnerUnavailable === true;
export const selectTextmodeRunnerReconnecting = (state: AppState): boolean =>
	state.engineStates.textmode?.customState.runnerReconnecting === true;
export const selectTextmodeRunnerReady = (state: AppState): boolean =>
	state.engineStates.textmode?.customState.runnerReady === true;

export const selectHasLastWorkingForError = (state: AppState): boolean => {
	if (!state.error?.source) return false;
	const engineState = state.engineStates[state.error.source];
	return engineState?.lastWorkingCode !== null && engineState?.lastWorkingCode !== undefined;
};
