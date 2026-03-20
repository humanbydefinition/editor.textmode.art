import type { AppState } from '@/platform/state/appStore';

export const selectSettings = (state: AppState) => state.settings;
export const selectShareState = (state: AppState) => state.share;
export const selectError = (state: AppState) => state.error;
export const selectIsMobile = (state: AppState) => state.isMobile;
export const selectActivePanel = (state: AppState) => state.activePanel;
export const selectPanels = (state: AppState) => state.panels;
export const selectSlugSketchInfo = (state: AppState) => state.slugSketchInfo;
export const selectTextmodeRunnerUnavailable = (state: AppState): boolean => state.runnerUnavailable;
export const selectTextmodeRunnerReconnecting = (state: AppState): boolean => state.runnerReconnecting;
