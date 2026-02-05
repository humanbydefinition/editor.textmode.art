import type { IAudioSource } from '../../../services/AudioService';

/**
 * Options for StrudelAudioSource
 */
export interface StrudelAudioSourceOptions {
    /** Strudel analyser ID (default: 'main') */
    analyserId?: string;
    /** FFT size (must be power of 2, default 1024) */
    fftSize?: number;
}

/**
 * Audio source adapter for Strudel.
 * Connects to Strudel's global window.analysers registry.
 */
export class StrudelAudioSource implements IAudioSource {
    private analyser: AnalyserNode | null = null;
    private readonly analyserId: string;
    private readonly fftSize: number;

    constructor(options: StrudelAudioSourceOptions = {}) {
        this.analyserId = options.analyserId ?? 'main';
        this.fftSize = options.fftSize ?? 1024;
    }

    /**
     * Connect to Strudel's analyser.
     * Strudel populates window.analysers after .analyze('id') is called.
     */
    connect(): boolean {
        // Access Strudel's global analysers registry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const analysers = (window as any).analysers as Record<string, AnalyserNode> | undefined;

        if (!analysers || !analysers[this.analyserId]) {
            return false;
        }

        this.analyser = analysers[this.analyserId];
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.8;
        return true;
    }

    /**
     * Disconnect from the analyser.
     */
    disconnect(): void {
        this.analyser = null;
    }

    /**
     * Get the connected AnalyserNode.
     */
    getAnalyser(): AnalyserNode | null {
        return this.analyser;
    }
}
