import type { PaneConfig } from '@/features/editor-layout/ui';
import type { AppSettings } from '@/types/app.types';

interface Panel {
	id: string;
	label: string;
}

export interface PaneStoreAdapter {
	setPanels: (panels: Panel[]) => void;
	getActivePanel: () => string;
	setActivePanel: (panelId: string) => void;
}

/**
 * Owns pane composition and pane readiness coordination.
 * Keeps layout concerns out of the main App orchestrator.
 */
export class PaneCoordinator {
	private paneConfigs: PaneConfig[] = [];
	private paneContainers = new Map<string, HTMLElement>();
	private paneReadyResolvers = new Map<string, (container: HTMLElement) => void>();

	sync(settings: AppSettings, store: PaneStoreAdapter): void {
		this.paneConfigs = this.buildPaneConfigs(settings);

		const panels: Panel[] = [
			{ id: 'textmode', label: 'textmode.js' },
			...(settings.strudelEnabled ? [{ id: 'strudel', label: 'strudel' }] : []),
		];

		store.setPanels(panels);

		const activePanel = store.getActivePanel();
		if (!panels.find((panel) => panel.id === activePanel)) {
			store.setActivePanel(panels[0]?.id ?? '');
		}
	}

	getPaneConfigs(): PaneConfig[] {
		return this.paneConfigs;
	}

	getPaneIds(): string[] {
		return this.paneConfigs.map((pane) => pane.id);
	}

	onPaneReady(paneId: string, container: HTMLElement): void {
		this.paneContainers.set(paneId, container);
		const resolver = this.paneReadyResolvers.get(paneId);
		if (resolver) {
			resolver(container);
			this.paneReadyResolvers.delete(paneId);
		}
	}

	removePane(paneId: string): void {
		this.paneContainers.delete(paneId);
	}

	waitForPane(paneId: string): Promise<HTMLElement> {
		const container = this.paneContainers.get(paneId);
		if (container) return Promise.resolve(container);

		return new Promise((resolve) => {
			this.paneReadyResolvers.set(paneId, resolve);
		});
	}

	async waitForPanes(paneIds: string[]): Promise<void> {
		await Promise.all(paneIds.map((paneId) => this.waitForPane(paneId)));
	}

	clearPendingResolvers(): void {
		this.paneReadyResolvers.clear();
	}

	private buildPaneConfigs(settings: AppSettings): PaneConfig[] {
		const panes: PaneConfig[] = [{ id: 'textmode', engineId: 'textmode' }];

		if (settings.strudelEnabled) {
			panes.push({ id: 'strudel', engineId: 'strudel' });
		}

		return panes;
	}
}
