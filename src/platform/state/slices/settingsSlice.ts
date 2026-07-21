import type { StateCreator } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types';
import type { AppState } from '../appStore';

export interface SettingsSlice {
	settings: AppSettings;
	setSettings: (settings: AppSettings) => void;
	updateSettings: (settings: Partial<AppSettings>) => void;
}

export const createSettingsSlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	SettingsSlice
> = (set) => ({
	settings: DEFAULT_SETTINGS,
	setSettings: (settings) => set({ settings }),
	updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
});
