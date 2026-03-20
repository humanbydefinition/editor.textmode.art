import { useAppStore } from '@/platform/state/appStore';

export interface PaneTab {
	id: string;
	label: string;
}

export interface PaneStateAdapter {
	setPanes: (panes: PaneTab[]) => void;
	getActivePaneId: () => string;
	setActivePaneId: (paneId: string) => void;
}

export function createPaneStateAdapter(): PaneStateAdapter {
	return {
		setPanes: (panes) => useAppStore.getState().setPanes(panes),
		getActivePaneId: () => useAppStore.getState().activePaneId,
		setActivePaneId: (paneId) => useAppStore.getState().setActivePaneId(paneId),
	};
}
