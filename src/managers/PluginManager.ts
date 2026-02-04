import { PluginRegistry, isAudioReactivePlugin } from '../engines';
import type { IPlugin } from '../engines/types';
import { audioService } from '../services/AudioService';
import { StrudelAudioSource } from '../engines/strudel/audio/StrudelAudioSource';
import { useAppStore } from '@/stores/appStore';
import type { IStorageService } from '../services/StorageService';
import type { HostServices, IPluginContainerProvider } from '../types/app.types';

/**
 * Manages the lifecycle and orchestration of plugins.
 */
export class PluginManager {
	private plugins: Map<string, IPlugin> = new Map();
	private audioUnsubscribe: (() => void) | null = null;

	private storage: IStorageService;
	private containerProvider: IPluginContainerProvider;
	private hostServices: HostServices;

	constructor(storage: IStorageService, containerProvider: IPluginContainerProvider, hostServices: HostServices) {
		this.storage = storage;
		this.containerProvider = containerProvider;
		this.hostServices = hostServices;

		// Load plugins from registry
		this.plugins = PluginRegistry.getInstance().getAll();
	}

	/**
	 * Get all registered plugins.
	 */
	getAll(): IPlugin[] {
		return Array.from(this.plugins.values());
	}

	/**
	 * Get a specific plugin by ID.
	 */
	get(id: string): IPlugin | undefined {
		return this.plugins.get(id);
	}

	/**
	 * Initialize all plugins.
	 */
	async initPlugins(): Promise<void> {
		for (const plugin of this.plugins.values()) {
			try {
				// Get container from layout manager
				const container = this.containerProvider.getPluginContainer(plugin.id);

				// Apply backdrop if enabled
				const settings = this.hostServices.getSettings();
				if (settings.editorBackdrop) {
					container.classList.add('editor-backdrop');
				}

				await plugin.init({

					editorContainer: container,
					visualContainer: document.body, // Shared visual container
					getSettings: this.hostServices.getSettings,
					callbacks: {
						onRenderOverlay: this.hostServices.renderOverlay,
						onSaveCode: (code: string) => this.storage.savePluginCode(plugin.id, code),
					},
					getInitialCode: () => this.storage.loadPluginCode(plugin.id),
					toggleUI: this.hostServices.toggleUI,
					changeFontSize: this.hostServices.changeFontSize,
				});
			} catch (e) {
				console.error(`Failed to initialize plugin ${plugin.id}:`, e);
			}
		}
	}

	/**
	 * Setup audio reactivity using the AudioService.
	 */
	setupAudioReactivity(): void {
		// Set up Strudel as the audio source
		const strudelSource = new StrudelAudioSource();
		audioService.setSource(strudelSource);

		// Subscribe to audio data
		this.audioUnsubscribe = audioService.subscribe((data) => {
			// Broadcast audio data to all audio-reactive plugins
			for (const plugin of this.plugins.values()) {
				if (isAudioReactivePlugin(plugin)) {
					plugin.sendAudioData({
						fft: new Float32Array(data.fft),
						waveform: new Float32Array(data.waveform),
						timestamp: data.timestamp,
					});
				}
			}
		});

		audioService.start();
	}

	/**
	 * Clear all plugin code and state.
	 */
	resetAll(): void {
		for (const plugin of this.plugins.values()) {
			useAppStore.getState().setPluginLastWorkingCode(plugin.id, null);
			plugin.setCode(plugin.getDefaultCode());
		}
		this.hushAll();
	}

	/**
	 * Hush all audio plugins.
	 */
	hushAll(): void {
		for (const plugin of this.plugins.values()) {
			if ('hush' in plugin && typeof (plugin as { hush: () => void }).hush === 'function') {
				(plugin as { hush: () => void }).hush();
			}
		}
	}

	/**
	 * Cleanup.
	 */
	dispose(): void {
		if (this.audioUnsubscribe) {
			this.audioUnsubscribe();
			this.audioUnsubscribe = null;
		}
		audioService.stop();
		for (const plugin of this.plugins.values()) {
			plugin.dispose();
		}
		this.plugins.clear();
	}
}

