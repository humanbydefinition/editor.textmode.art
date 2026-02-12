import { useAppStore } from '@/platform/state/appStore';
import type { PaneStoreAdapter } from '@/features/editor-layout/model/PaneCoordinator';

export function createPaneStoreAdapter(): PaneStoreAdapter {
	return {
		setPanels: (panels) => useAppStore.getState().setPanels(panels),
		getActivePanel: () => useAppStore.getState().activePanel,
		setActivePanel: (panelId) => useAppStore.getState().setActivePanel(panelId),
	};
}
