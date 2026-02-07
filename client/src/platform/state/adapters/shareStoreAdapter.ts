import { useAppStore } from '@/platform/state/appStore';
import type { SharePayload } from '@/types/share.types';

export interface ShareStoreAdapter {
	getShareState: () => {
		payload: SharePayload | null;
		consented: boolean;
		promptOpen: boolean;
	};
	setSharePayload: (payload: SharePayload | null) => void;
	setShareConsented: (consented: boolean) => void;
	setSharePromptOpen: (open: boolean) => void;
}

export function createShareStoreAdapter(): ShareStoreAdapter {
	return {
		getShareState: () => useAppStore.getState().share,
		setSharePayload: (payload) => useAppStore.getState().setSharePayload(payload),
		setShareConsented: (consented) => useAppStore.getState().setShareConsented(consented),
		setSharePromptOpen: (open) => useAppStore.getState().setSharePromptOpen(open),
	};
}
