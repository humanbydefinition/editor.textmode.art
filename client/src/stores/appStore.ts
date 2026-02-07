/**
 * Centralized Zustand store — composed from domain slices.
 *
 * Each slice owns a single concern (settings, engines, share, UI).
 * This file wires them together and exposes the unified store hook.
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import { createSettingsSlice, type SettingsSlice } from './slices/settingsSlice';
import { createEngineSlice, type EngineSlice } from './slices/engineSlice';
import { createShareSlice, type ShareSlice } from './slices/shareSlice';
import { createUISlice, initUISlice, type UISlice } from './slices/uiSlice';

// Re-export slice types for consumers
export type { EngineState } from './slices/engineSlice';
export type { Panel } from './slices/uiSlice';

/**
 * Combined application state — intersection of all slices.
 */
export type AppState = SettingsSlice & EngineSlice & ShareSlice & UISlice;

export const useAppStore = create<AppState>()(
    devtools(
        subscribeWithSelector((...a) => ({
            ...createSettingsSlice(...a),
            ...createEngineSlice(...a),
            ...createShareSlice(...a),
            ...createUISlice(...a),
        })),
        { name: 'AppStore', enabled: import.meta.env.DEV },
    ),
);

/**
 * Initialize app store with window resize listener.
 */
export function initAppStore(): () => void {
    return initUISlice(() => useAppStore.getState());
}
