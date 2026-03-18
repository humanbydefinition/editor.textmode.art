/**
 * Audio data snapshot for visual plugins.
 */
export interface AudioData {
    /** Frequency domain data (0-255 per bin) */
    fft: number[];
    /** Time domain waveform data (0-255) */
    waveform: number[];
    /** Timestamp for synchronization */
    timestamp: number;
}

/**
 * Interface for any provider of audio analysis data.
 * Implement this to add support for new audio engines.
 *
 * @example
 * ```typescript
 * class ToneAudioSource implements IAudioSource {
 *     connect(): boolean { ... }
 *     disconnect(): void { ... }
 *     getAnalyser(): AnalyserNode | null { ... }
 * }
 * ```
 */
export interface IAudioSource {
    /** Attempt to connect to the audio source. Returns true on success. */
    connect(): boolean;

    /** Disconnect from the audio source. */
    disconnect(): void;

    /** Get the AnalyserNode for audio analysis, or null if not connected. */
    getAnalyser(): AnalyserNode | null;
}

/**
 * Callback for receiving audio data.
 */
export type AudioDataCallback = (data: AudioData) => void;

/**
 * Options for AudioService
 */
export interface AudioServiceOptions {
    /** FFT size for analysis (default 1024) */
    fftSize?: number;
}

/**
 * Central audio analysis service.
 * Runs the analysis loop and dispatches audio data to subscribers.
 * Agnostic to the underlying audio source implementation.
 */
export class AudioService {
    private source: IAudioSource | null = null;
    private callbacks: Set<AudioDataCallback> = new Set();
    private rafId: number | null = null;
    private isRunning = false;

    private fftData: Uint8Array<ArrayBuffer>;
    private waveformData: Uint8Array<ArrayBuffer>;
    private readonly fftSize: number;

    constructor(options: AudioServiceOptions = {}) {
        this.fftSize = options.fftSize ?? 1024;
        this.fftData = new Uint8Array(this.fftSize / 2) as Uint8Array<ArrayBuffer>;
        this.waveformData = new Uint8Array(this.fftSize) as Uint8Array<ArrayBuffer>;
    }

    /**
     * Set the active audio source.
     * Disconnects the previous source if any.
     */
    setSource(source: IAudioSource | null): void {
        if (this.source) {
            this.source.disconnect();
        }
        this.source = source;
    }

    /**
     * Subscribe to audio data updates.
     * @returns Unsubscribe function.
     */
    subscribe(callback: AudioDataCallback): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * Start the analysis loop.
     */
    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.poll();
    }

    /**
     * Stop the analysis loop.
     */
    stop(): void {
        this.isRunning = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /**
     * Get current audio data snapshot.
     */
    getData(): AudioData {
        return {
            fft: Array.from(this.fftData),
            waveform: Array.from(this.waveformData),
            timestamp: performance.now(),
        };
    }

    /**
     * Internal polling loop.
     */
    private poll = (): void => {
        if (!this.isRunning) return;

        // Try to connect if source exists but not connected
        if (this.source) {
            const analyser = this.source.getAnalyser();
            if (!analyser) {
                // Try reconnecting (audio may not be ready yet)
                this.source.connect();
            } else {
                // Extract data
                analyser.getByteFrequencyData(this.fftData);
                analyser.getByteTimeDomainData(this.waveformData);

                // Notify subscribers
                const data = this.getData();
                this.callbacks.forEach((cb) => cb(data));
            }
        }

        this.rafId = requestAnimationFrame(this.poll);
    };

    /**
     * Cleanup.
     */
    dispose(): void {
        this.stop();
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        this.callbacks.clear();
    }
}

/**
 * Singleton audio service instance.
 */
export const audioService = new AudioService();
