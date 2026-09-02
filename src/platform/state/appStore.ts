/**
 * Centralized application state. Audio remains separate because its controller
 * owns a non-trivial browser lifecycle; the rest is direct application state.
 */
import { create, type StateCreator } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { GallerySketch } from '@/features/gallery-sketches';
import type { SharePayload } from '@/features/share/model/sharePayload';
import { DEFAULT_SETTINGS, type AppSettings, type CodeError } from '@/types';
import { createAudioSlice, type AudioSlice } from './slices/audioSlice';
import type { AgentActivityEntry, AgentProposalView, PreparedExportView } from '@/features/webmcp/model/contracts';

export type RunnerStatus = 'connected' | 'unavailable' | 'reconnecting';

export interface AppState extends AudioSlice {
	settings: AppSettings;
	error: CodeError | null;
	lastWorkingCode: string | null;
	runnerStatus: RunnerStatus;
	share: {
		payload: SharePayload | null;
		consented: boolean;
		promptOpen: boolean;
	};
	gallerySketch: GallerySketch | null;
	originalGallerySketch: GallerySketch | null;
	agent: {
		support: 'unsupported' | 'registering' | 'ready' | 'limited' | 'error';
		registeredTools: string[];
		proposal: AgentProposalView | null;
		preparedExport: PreparedExportView | null;
		activity: AgentActivityEntry[];
	};

	setSettings: (settings: AppSettings) => void;
	updateSettings: (settings: Partial<AppSettings>) => void;
	setError: (error: CodeError | null) => void;
	setLastWorkingCode: (code: string | null) => void;
	setRunnerStatus: (status: RunnerStatus) => void;
	setSharePayload: (payload: SharePayload | null) => void;
	setShareConsented: (consented: boolean) => void;
	setSharePromptOpen: (open: boolean) => void;
	setGallerySketch: (sketch: GallerySketch | null) => void;
	clearGallerySketches: () => void;
	setAgentSupport: (support: AppState['agent']['support']) => void;
	setRegisteredAgentTools: (tools: string[]) => void;
	setAgentProposal: (proposal: AgentProposalView | null) => void;
	setPreparedExport: (artifact: PreparedExportView | null) => void;
	appendAgentActivity: (entry: AgentActivityEntry) => void;
}

export type AppSlice<T> = StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	T
>;

export const useAppStore = create<AppState>()(
	devtools(
		subscribeWithSelector((set, get, store) => ({
			settings: DEFAULT_SETTINGS,
			error: null,
			lastWorkingCode: null,
			runnerStatus: 'connected',
			share: { payload: null, consented: false, promptOpen: false },
			gallerySketch: null,
			originalGallerySketch: null,
			agent: { support: 'unsupported', registeredTools: [], proposal: null, preparedExport: null, activity: [] },

			setSettings: (settings) => set({ settings }),
			updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
			setError: (error) => set({ error }),
			setLastWorkingCode: (lastWorkingCode) => set({ lastWorkingCode }),
			setRunnerStatus: (runnerStatus) => set({ runnerStatus }),
			setSharePayload: (payload) => set({ share: { payload, consented: false, promptOpen: Boolean(payload) } }),
			setShareConsented: (consented) =>
				set((state) => ({
					share: { ...state.share, consented, promptOpen: consented ? false : state.share.promptOpen },
				})),
			setSharePromptOpen: (promptOpen) =>
				set((state) => ({
					share: { ...state.share, promptOpen: promptOpen && Boolean(state.share.payload) },
				})),
			setGallerySketch: (sketch) =>
				set(sketch ? { gallerySketch: sketch, originalGallerySketch: sketch } : { gallerySketch: null }),
			clearGallerySketches: () => set({ gallerySketch: null, originalGallerySketch: null }),
			setAgentSupport: (support) => set((state) => ({ agent: { ...state.agent, support } })),
			setRegisteredAgentTools: (registeredTools) =>
				set((state) => ({ agent: { ...state.agent, registeredTools } })),
			setAgentProposal: (proposal) => set((state) => ({ agent: { ...state.agent, proposal } })),
			setPreparedExport: (preparedExport) => set((state) => ({ agent: { ...state.agent, preparedExport } })),
			appendAgentActivity: (entry) =>
				set((state) => ({ agent: { ...state.agent, activity: [...state.agent.activity, entry].slice(-20) } })),

			...createAudioSlice(set, get, store),
		})),
		{ name: 'AppStore', enabled: import.meta.env.DEV }
	)
);
