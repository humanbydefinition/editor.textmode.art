import type { StateCreator } from 'zustand';
import { MOBILE_BREAKPOINT } from '@/core/app.types';
import type { AppState } from '../appStore';

export interface UISlice {
	isMobile: boolean;

	setIsMobile: (isMobile: boolean) => void;
}

export const createUISlice: StateCreator<
	AppState,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never]],
	[],
	UISlice
> = (set) => ({
	isMobile: typeof window !== 'undefined' ? window.innerWidth <= MOBILE_BREAKPOINT : false,

	setIsMobile: (isMobile) => set({ isMobile }),
});

/**
 * Initialize UI slice with window resize listener.
 */
export function initUISlice(getState: () => AppState): () => void {
	const handleResize = () => {
		const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
		const currentIsMobile = getState().isMobile;
		if (isMobile !== currentIsMobile) {
			getState().setIsMobile(isMobile);
		}
	};

	window.addEventListener('resize', handleResize);
	handleResize();

	return () => window.removeEventListener('resize', handleResize);
}
