import type { PaneConfig } from '@/features/editor-layout';
import type { AppSettings } from '@/core/app.types';
import type { PaneStateAdapter, PaneTab } from '@/platform/state/adapters/paneStateAdapter';

/**
 * Owns pane composition and pane readiness coordination.
 * Keeps layout concerns out of the main App orchestrator.
 */
export class PaneCoordinator {
	private paneConfigs: PaneConfig[] = [];
	private paneContainers = new Map<string, HTMLElement>();
	private paneReadyResolvers = new Map<string, (container: HTMLElement) => void>();

	sync(settings: AppSettings, store: PaneStateAdapter): void {
		this.paneConfigs = this.buildPaneConfigs(settings);

		const panes: PaneTab[] = [{ id: 'textmode', label: 'textmode.js' }];

		store.setPanes(panes);

		const activePaneId = store.getActivePaneId();
		if (!panes.find((pane) => pane.id === activePaneId)) {
			store.setActivePaneId(panes[0]?.id ?? '');
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
		void settings;
		return [{ id: 'textmode' }];
	}
}
