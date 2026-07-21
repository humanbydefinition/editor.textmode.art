/**
 * Centralized Zustand store — composed from domain slices.
 *
 * Each slice owns a single concern (settings, runtime, share, gallery, audio).
 * This file wires them together and exposes the unified store hook.
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { createRuntimeSlice, type RuntimeSlice } from './slices/runtimeSlice';
import { createShareSlice, type ShareSlice } from './slices/shareSlice';
import { createGallerySlice, type GallerySlice } from './slices/gallerySlice';
import { createAudioSlice, type AudioSlice } from './slices/audioSlice';

/**
 * Combined application state — intersection of all slices.
 */
export type AppState = SettingsSlice & RuntimeSlice & ShareSlice & GallerySlice & AudioSlice;

export const useAppStore = create<AppState>()(
	devtools(
		subscribeWithSelector((...a) => ({
			...createSettingsSlice(...a),
			...createRuntimeSlice(...a),
			...createShareSlice(...a),
			...createGallerySlice(...a),
			...createAudioSlice(...a),
		})),
		{ name: 'AppStore', enabled: import.meta.env.DEV }
	)
);
