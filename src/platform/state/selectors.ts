import type { AppState } from '@/platform/state/appStore';

export const selectSettings = (state: AppState) => state.settings;
export const selectSharePayload = (state: AppState) => state.share.payload;
export const selectShareConsented = (state: AppState) => state.share.consented;
export const selectSharePromptOpen = (state: AppState) => state.share.promptOpen;
export const selectGallerySketchSummary = (state: AppState) => state.gallerySketchSummary;
export const selectError = (state: AppState) => state.error;
export const selectIsMobile = (state: AppState) => state.isMobile;
export const selectTextmodeRunnerUnavailable = (state: AppState): boolean => state.runnerUnavailable;
export const selectTextmodeRunnerReconnecting = (state: AppState): boolean => state.runnerReconnecting;
export const selectRandomizeLoading = (state: AppState): boolean => state.randomizeLoading;
export const selectEditorBackdrop = (state: AppState): boolean => state.settings.editorBackdrop;
