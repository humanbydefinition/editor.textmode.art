import type { AppState } from '@/platform/state/appStore';

export const selectSettings = (state: AppState) => state.settings;
export const selectSharePayload = (state: AppState) => state.share.payload;
export const selectShareConsented = (state: AppState) => state.share.consented;
export const selectSharePromptOpen = (state: AppState) => state.share.promptOpen;
export const selectGallerySketch = (state: AppState) => state.gallerySketch;
export const selectError = (state: AppState) => state.error;
export const selectTextmodeRunnerStatus = (state: AppState) => state.runnerStatus;
export const selectEditorBackdrop = (state: AppState): boolean => state.settings.editorBackdrop;
export const selectAudioInput = (state: AppState) => state.audioInput;
