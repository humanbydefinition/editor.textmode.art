import { useAppStore } from '@/platform/state/appStore';

export interface PaneStorePanel {
	id: string;
	label: string;
}

export interface PaneStoreAdapter {
	setPanels: (panels: PaneStorePanel[]) => void;
	getActivePanel: () => string;
	setActivePanel: (panelId: string) => void;
}

export function createPaneStoreAdapter(): PaneStoreAdapter {
	return {
		setPanels: (panels) => useAppStore.getState().setPanels(panels),
		getActivePanel: () => useAppStore.getState().activePanel,
		setActivePanel: (panelId) => useAppStore.getState().setActivePanel(panelId),
	};
}
