export interface BroadcastTimerManagerOptions {
	onCycleTick: () => void;
	onAudioTick: () => void;
	isPlaying: () => boolean;
}

export class BroadcastTimerManager {
	private cycleBroadcastTimer: ReturnType<typeof setInterval> | null = null;
	private audioBroadcastTimer: ReturnType<typeof setInterval> | null = null;
	private readonly options: BroadcastTimerManagerOptions;

	constructor(options: BroadcastTimerManagerOptions) {
		this.options = options;
	}

	startCycleBroadcast(): void {
		if (this.cycleBroadcastTimer !== null) return;
		this.cycleBroadcastTimer = setInterval(() => {
			this.options.onCycleTick();
		}, 100);
	}

	stopCycleBroadcast(): void {
		if (this.cycleBroadcastTimer === null) return;
		clearInterval(this.cycleBroadcastTimer);
		this.cycleBroadcastTimer = null;
	}

	startAudioBroadcast(): void {
		if (this.audioBroadcastTimer !== null) return;
		this.audioBroadcastTimer = setInterval(() => {
			if (!this.options.isPlaying()) return;
			this.options.onAudioTick();
		}, 16);
	}

	stopAudioBroadcast(): void {
		if (this.audioBroadcastTimer === null) return;
		clearInterval(this.audioBroadcastTimer);
		this.audioBroadcastTimer = null;
	}

	dispose(): void {
		this.stopCycleBroadcast();
		this.stopAudioBroadcast();
	}
}
