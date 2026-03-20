import type { AppState } from '@/platform/state/appStore';

export const selectSettings = (state: AppState) => state.settings;
export const selectShareState = (state: AppState) => state.share;
export const selectError = (state: AppState) => state.error;
export const selectIsMobile = (state: AppState) => state.isMobile;
export const selectActivePaneId = (state: AppState) => state.activePaneId;
export const selectPanes = (state: AppState) => state.panes;
export const selectSketchSummary = (state: AppState) => state.sketchSummary;
export const selectTextmodeRunnerUnavailable = (state: AppState): boolean => state.runnerUnavailable;
export const selectTextmodeRunnerReconnecting = (state: AppState): boolean => state.runnerReconnecting;
