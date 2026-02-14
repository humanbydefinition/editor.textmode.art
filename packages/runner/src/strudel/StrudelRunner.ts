import type { MiniLocation } from '@strudel/core';
import {
    evaluate as evaluateStrudel,
    hush as hushStrudel,
    initAudio,
    initStrudel,
    registerZZFXSounds,
    samples as loadSamples,
} from '@strudel/web';
import {
	isStrudelInitMessage,
	isStrudelParentMessage,
	type StrudelHapDto,
	type StrudelMiniLocationDto,
	type StrudelAudioDataMessage,
	type StrudelParentToRunnerMessage,
	type StrudelRunnerToParentMessage,
	type StrudelWindowToRunnerMessage,
} from '@synth.textmode.art/contracts/runner/strudel';
import { BaseRunner } from '@/core/runner/BaseRunner';

const STRUDEL_WINDOW_EVENT_TYPE = 'STRUDEL_RUNNER_EVENT';

interface StrudelSchedulerLike {
    now: () => number;
}

interface StrudelStateLike {
    miniLocations?: Array<MiniLocation | { start?: unknown; end?: unknown }>;
}

interface StrudelPatternLike {
    queryArc?: (begin: number, end: number) => Array<{
        whole?: {
            begin: { valueOf(): number };
            end: { valueOf(): number };
        };
        context?: {
            locations?: Array<{ start: number; end: number }>;
        };
    }>;
}

interface StrudelReplLike {
    scheduler?: StrudelSchedulerLike;
    state?: StrudelStateLike;
    stop?: () => void;
}

interface UnlockPromptElements {
    root: HTMLDivElement;
    card: HTMLDivElement;
    title: HTMLHeadingElement;
    description: HTMLParagraphElement;
    button: HTMLButtonElement;
    status: HTMLParagraphElement;
}

export class StrudelRunner extends BaseRunner<StrudelRunnerToParentMessage> {
    private repl: StrudelReplLike | null = null;
    private currentPattern: StrudelPatternLike | null = null;
    private runtimeInitPromise: Promise<void> | null = null;
    private runtimeInitialized = false;
    private audioInitialized = false;
    private isPlaying = false;
    private cycleBroadcastTimer: number | null = null;
    private audioBroadcastTimer: number | null = null;
    private pendingAutostartCode: string | null = null;
    private unlockPrompt: UnlockPromptElements | null = null;
    private unlockPromptVisible = false;
    private activeParentOrigin: string | null = null;
    private initAudioRequestPromise: Promise<void> | null = null;

    constructor() {
        super();
    }

    start(): void {
        this.setupUnlockPrompt();
        this.setupGlobalErrorHandlers((error) => this.sendRunError(error));
        window.addEventListener('message', this.handleWindowMessage);
    };

    private handlePortMessage = (event: MessageEvent<StrudelParentToRunnerMessage>): void => {
        const message = event.data;
        if (!isStrudelParentMessage(message)) return;

        void this.handleParentMessage(message);
    };

    private async handleParentMessage(message: StrudelParentToRunnerMessage): Promise<void> {
        switch (message.type) {
            case 'STR_INIT_AUDIO':
                await this.handleInitAudioRequest();
                break;
            case 'STR_RUN_CODE':
                await this.runCode(message.code, message.autostart ?? true);
                break;
            case 'STR_HUSH':
                this.hush();
                break;
            case 'STR_DISPOSE':
                this.dispose();
                break;
        }
    }

    private async handleInitAudioRequest(): Promise<void> {
        if (this.initAudioRequestPromise) {
            await this.initAudioRequestPromise;
            return;
        }

        this.initAudioRequestPromise = (async () => {
        if (this.audioInitialized) {
            this.sendReady();
            return;
        }

        const initialized = await this.initializeAudio();
        if (initialized) {
            this.hideUnlockPrompt();
            this.sendReady();
            return;
        }

        this.showUnlockPrompt();
        this.sendMessage({ type: 'STR_AUDIO_UNLOCK_REQUIRED' });
        })();

        try {
            await this.initAudioRequestPromise;
        } finally {
            this.initAudioRequestPromise = null;
        }
    }

    private async ensureRuntimeInitialized(): Promise<void> {
        if (this.runtimeInitialized) return;
        if (this.runtimeInitPromise) {
            await this.runtimeInitPromise;
            return;
        }

        this.runtimeInitPromise = (async () => {
            const repl = await initStrudel({
                autostart: false,
                onEvalError: (error: Error) => this.sendRunError(error),
                prebake: async () => {
                    const preloadTasks = [
                        loadSamples('github:tidalcycles/dirt-samples'),
                        registerZZFXSounds(),
                    ];
                    const results = await Promise.allSettled(preloadTasks);
                    for (const result of results) {
                        if (result.status === 'rejected') {
                            console.warn('[StrudelRunner] Optional preload failed:', result.reason);
                        }
                    }
                },
            });
            this.repl = repl as unknown as StrudelReplLike;
            this.runtimeInitialized = true;
        })();

        try {
            await this.runtimeInitPromise;
        } finally {
            this.runtimeInitPromise = null;
        }
    }

    private async initializeAudio(): Promise<boolean> {
        try {
            await this.ensureRuntimeInitialized();
            await initAudio();
            this.audioInitialized = true;
            this.hideUnlockPrompt();
            this.setUnlockPromptStatus('');
            return true;
        } catch (error) {
            if (this.isUserActivationRequiredError(error)) {
                return false;
            }
            this.sendRunError(error);
            return false;
        }
    }

    private async runCode(code: string, autostart: boolean): Promise<void> {
        try {
            await this.ensureRuntimeInitialized();
            if (!this.audioInitialized) {
                const initialized = await this.initializeAudio();
                if (!initialized) {
                    if (autostart) {
                        this.pendingAutostartCode = code;
                    }

                    const evaluatedPattern = await evaluateStrudel(code, false) as StrudelPatternLike;
                    this.isPlaying = false;
                    this.stopCycleBroadcast();
                    this.stopAudioBroadcast();
                    this.currentPattern = evaluatedPattern;

                    const patternDerivedLocations = this.collectMiniLocationsFromPattern(evaluatedPattern);
                    const miniLocations = this.serializeMiniLocations(this.repl?.state?.miniLocations);
                    const haps = this.collectHapsFromPattern(evaluatedPattern, this.getCycle());

                    this.sendMessage({
                        type: 'STR_RUN_OK',
                        timestamp: Date.now(),
                        miniLocations: patternDerivedLocations ?? miniLocations,
                        haps,
                        cycle: this.getCycle(),
                        isPlaying: false,
                    });
                    this.sendPlayState();
                    this.showUnlockPrompt();
                    this.sendMessage({ type: 'STR_AUDIO_UNLOCK_REQUIRED' });
                    return;
                }
            }

            this.pendingAutostartCode = null;

            const evaluatedPattern = await evaluateStrudel(code, autostart) as StrudelPatternLike;

            this.isPlaying = autostart;
            if (this.isPlaying) {
                this.startCycleBroadcast();
                this.startAudioBroadcast();
            } else {
                this.stopCycleBroadcast();
                this.stopAudioBroadcast();
            }

            const patternDerivedLocations = this.collectMiniLocationsFromPattern(evaluatedPattern);
            const miniLocations = this.serializeMiniLocations(this.repl?.state?.miniLocations);
            const haps = this.collectHapsFromPattern(evaluatedPattern, this.getCycle());
            this.currentPattern = evaluatedPattern;

            this.sendMessage({
                type: 'STR_RUN_OK',
                timestamp: Date.now(),
                miniLocations: patternDerivedLocations ?? miniLocations,
                haps,
                cycle: this.getCycle(),
                isPlaying: this.isPlaying,
            });
            this.sendPlayState();
        } catch (error) {
            this.sendRunError(error);
        }
    }

    private hush(): void {
        try {
            if (this.runtimeInitialized) {
                hushStrudel();
                this.repl?.stop?.();
            }
        } catch (error) {
            this.sendRunError(error);
        } finally {
            this.isPlaying = false;
            this.currentPattern = null;
            this.pendingAutostartCode = null;
            this.stopCycleBroadcast();
            this.stopAudioBroadcast();
            if (this.audioInitialized) {
                this.hideUnlockPrompt();
            } else {
                this.showUnlockPrompt();
            }
            this.sendPlayState();
        }
    }

    private dispose(): void {
        this.hush();
        this.stopCycleBroadcast();
        this.stopAudioBroadcast();
        window.removeEventListener('message', this.handleWindowMessage);
        if (this.unlockPrompt) {
            this.unlockPrompt.button.removeEventListener('click', this.handleUnlockButtonClick);
            this.unlockPrompt.root.remove();
            this.unlockPrompt = null;
            this.unlockPromptVisible = false;
        }
        if (this.messagePort) {
            this.messagePort.close();
            this.messagePort = null;
        }
    }

    private sendReady(): void {
        this.sendMessage({
            type: 'STR_READY',
            runtimeInitialized: this.runtimeInitialized,
            audioInitialized: this.audioInitialized,
        });
    }

    private sendPlayState(): void {
        const cycle = this.getCycle();
        this.sendMessage({
            type: 'STR_PLAY_STATE',
            isPlaying: this.isPlaying,
            cycle,
            haps: this.collectHapsFromPattern(this.currentPattern ?? undefined, cycle),
        });
    }

    private getCycle(): number {
        try {
            const scheduler = this.repl?.scheduler;
            if (scheduler && typeof scheduler.now === 'function') {
                const cycle = scheduler.now();
                if (Number.isFinite(cycle)) {
                    return cycle;
                }
            }
        } catch {
            return 0;
        }
        return 0;
    }

    private startCycleBroadcast(): void {
        if (this.cycleBroadcastTimer !== null) return;
        this.cycleBroadcastTimer = window.setInterval(() => {
            this.sendPlayState();
        }, 100);
    }

    private stopCycleBroadcast(): void {
        if (this.cycleBroadcastTimer === null) return;
        window.clearInterval(this.cycleBroadcastTimer);
        this.cycleBroadcastTimer = null;
    }

    private startAudioBroadcast(): void {
        if (this.audioBroadcastTimer !== null) return;
        // Use setInterval instead of rAF because the runner iframe is hidden
        // and browsers may throttle/stop rAF in non-visible frames.
        this.audioBroadcastTimer = window.setInterval(() => {
            if (!this.isPlaying) return;
            this.sendAudioData();
        }, 16);
    }

    private stopAudioBroadcast(): void {
        if (this.audioBroadcastTimer === null) return;
        window.clearInterval(this.audioBroadcastTimer);
        this.audioBroadcastTimer = null;
    }

    private setupUnlockPrompt(): void {
        document.documentElement.style.height = '100%';
        document.documentElement.style.background = 'transparent';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
        document.body.style.background = 'transparent';

        const style = document.createElement('style');
        style.textContent = `
            .strudel-unlock-root {
                position: fixed;
                inset: 0;
                display: none;
                pointer-events: none;
                color: #f4f4f5;
                font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
                box-sizing: border-box;
            }
            .strudel-unlock-card {
                width: 100%;
                height: 100%;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                background: linear-gradient(180deg, rgba(24, 24, 27, 0.97) 0%, rgba(9, 9, 11, 0.98) 100%);
                box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
                padding: 10px 10px 9px;
                display: grid;
                grid-template-rows: auto auto auto auto;
                gap: 8px;
                pointer-events: auto;
                box-sizing: border-box;
                overflow: hidden;
            }
            .strudel-unlock-title {
                margin: 0;
                font-size: 12px;
                font-weight: 600;
                line-height: 1.3;
                letter-spacing: 0.01em;
                color: rgba(255, 255, 255, 0.96);
            }
            .strudel-unlock-description {
                margin: 0;
                font-size: 11px;
                line-height: 1.45;
                color: rgba(212, 212, 216, 0.9);
                max-width: 36ch;
            }
            .strudel-unlock-button {
                height: 30px;
                border: 1px solid rgba(255, 255, 255, 0.14);
                border-radius: 8px;
                padding: 0 10px;
                font-size: 11px;
                font-weight: 600;
                cursor: pointer;
                background: rgba(39, 39, 42, 0.88);
                color: rgba(250, 250, 250, 0.95);
                text-transform: lowercase;
                transition: background-color 120ms ease, border-color 120ms ease, transform 120ms ease;
            }
            .strudel-unlock-button:hover {
                background: rgba(63, 63, 70, 0.95);
                border-color: rgba(255, 255, 255, 0.22);
            }
            .strudel-unlock-button:active {
                transform: translateY(1px);
            }
            .strudel-unlock-button:focus-visible {
                outline: 2px solid rgba(161, 161, 170, 0.35);
                outline-offset: 1px;
            }
            .strudel-unlock-button:disabled {
                cursor: default;
                opacity: 0.72;
            }
            .strudel-unlock-status {
                margin: 0;
                font-size: 10px;
                min-height: 13px;
                line-height: 1.3;
                color: #fda4af;
                display: none;
            }
        `;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.className = 'strudel-unlock-root';

        const card = document.createElement('div');
        card.className = 'strudel-unlock-card';

        const title = document.createElement('h1');
        title.textContent = 'enable strudel audio';
        title.className = 'strudel-unlock-title';

        const description = document.createElement('p');
        description.textContent = 'browser policy blocked autoplay. tap once to unlock audio playback.';
        description.className = 'strudel-unlock-description';

        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'enable audio';
        button.className = 'strudel-unlock-button';
        button.addEventListener('click', this.handleUnlockButtonClick);

        const status = document.createElement('p');
        status.className = 'strudel-unlock-status';

        card.appendChild(title);
        card.appendChild(description);
        card.appendChild(button);
        card.appendChild(status);
        root.appendChild(card);
        document.body.appendChild(root);

        this.unlockPrompt = { root, card, title, description, button, status };
        this.showUnlockPrompt();
    }

    private showUnlockPrompt(): void {
        if (!this.unlockPrompt) return;
        this.unlockPromptVisible = true;
        this.unlockPrompt.root.style.display = 'block';
        this.unlockPrompt.button.disabled = false;
        this.unlockPrompt.button.textContent = 'enable audio';
        this.setUnlockPromptStatus('');
    }

    private hideUnlockPrompt(): void {
        if (!this.unlockPrompt) return;
        this.unlockPromptVisible = false;
        this.unlockPrompt.root.style.display = 'none';
        this.setUnlockPromptStatus('');
    }

    private setUnlockPromptStatus(message: string): void {
        if (!this.unlockPrompt) return;
        this.unlockPrompt.status.textContent = message;
        this.unlockPrompt.status.style.display = message.length > 0 ? 'block' : 'none';
    }

    private handleUnlockButtonClick = async (): Promise<void> => {
        if (!this.unlockPrompt || !this.unlockPromptVisible) return;

        this.unlockPrompt.button.disabled = true;
        this.unlockPrompt.button.textContent = 'enabling...';
        this.setUnlockPromptStatus('');

        const initialized = await this.initializeAudio();
        if (initialized) {
            this.hideUnlockPrompt();
            this.sendReady();
            if (this.pendingAutostartCode) {
                const pendingCode = this.pendingAutostartCode;
                this.pendingAutostartCode = null;
                await this.runCode(pendingCode, true);
            }
            return;
        }

        this.unlockPrompt.button.disabled = false;
        this.unlockPrompt.button.textContent = 'enable audio';
        this.setUnlockPromptStatus('audio is still blocked. tap once more.');
    };

    private isUserActivationRequiredError(error: unknown): boolean {
        if (!(error instanceof Error)) return false;

        const domLikeError = error as { name?: string };
        const name = domLikeError.name ?? '';
        const message = error.message.toLowerCase();
        return (
            name === 'NotAllowedError' ||
            name === 'InvalidStateError' ||
            message.includes('not allowed') ||
            message.includes('user gesture') ||
            message.includes('interaction')
        );
    }

    private sendAudioData(): void {
        // Prefer the same analyser registry Strudel exposes globally in the runner context.
        // This avoids module-instance mismatch issues across bundled dependency copies.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globalAnalysers = (window as any).analysers as Record<string, AnalyserNode | undefined> | undefined;
        const analyser =
            globalAnalysers?.['main'] ??
            (globalAnalysers
                ? Object.values(globalAnalysers).find((candidate): candidate is AnalyserNode => Boolean(candidate))
                : undefined);
        if (!analyser) return;

        const fft = new Uint8Array(analyser.frequencyBinCount);
        const waveform = new Uint8Array(analyser.fftSize);
        analyser.getByteFrequencyData(fft);
        analyser.getByteTimeDomainData(waveform);

        const message: StrudelAudioDataMessage = {
            type: 'STR_AUDIO_DATA',
            fft,
            waveform,
            timestamp: performance.now(),
        };
        this.sendMessage(message);
    }

    private sendRunError(error: unknown): void {
        const normalized = this.normalizeError(error);
        this.sendMessage({
            type: 'STR_RUN_ERROR',
            message: normalized.message,
            stack: normalized.stack,
            line: normalized.line,
            column: normalized.column,
        });
    }

    private normalizeError(error: unknown): { message: string; stack?: string; line?: number; column?: number } {
        if (!(error instanceof Error)) {
            return { message: String(error) };
        }

        let line: number | undefined;
        let column: number | undefined;

        const lineMatch = error.message.match(/line (\d+)/i);
        const columnMatch = error.message.match(/column (\d+)/i);

        const lineValue = lineMatch?.[1];
        if (lineValue) {
            line = parseInt(lineValue, 10);
        }
        const columnValue = columnMatch?.[1];
        if (columnValue) {
            column = parseInt(columnValue, 10);
        }

        return {
            message: error.message,
            stack: error.stack,
            line,
            column,
        };
    }

    private serializeMiniLocations(
        miniLocations: Array<MiniLocation | { start?: unknown; end?: unknown }> | undefined
    ): StrudelMiniLocationDto[] | undefined {
        if (!miniLocations || miniLocations.length === 0) return undefined;

        const serialized: StrudelMiniLocationDto[] = [];

        for (const location of miniLocations) {
            const normalized = this.normalizeMiniLocation(location);
            if (normalized) {
                serialized.push(normalized);
            }
        }

        return serialized.length > 0 ? serialized : undefined;
    }

    private normalizeMiniLocation(
        location: MiniLocation | { start?: unknown; end?: unknown }
    ): StrudelMiniLocationDto | null {
        const start = (location as { start?: unknown }).start;
        const end = (location as { end?: unknown }).end;
        if (!start || !end) return null;

        // Handle classic miniLocation shape: { start: { line, column, offset }, end: { ... } }
        if (
            typeof start === 'object' &&
            start !== null &&
            typeof end === 'object' &&
            end !== null &&
            'offset' in start &&
            'offset' in end
        ) {
            const startOffset = Number((start as { offset?: unknown }).offset);
            const endOffset = Number((end as { offset?: unknown }).offset);
            if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || startOffset >= endOffset) {
                return null;
            }

            const startLine = Number((start as { line?: unknown }).line);
            const startColumn = Number((start as { column?: unknown }).column);
            const endLine = Number((end as { line?: unknown }).line);
            const endColumn = Number((end as { column?: unknown }).column);

            return {
                start: {
                    line: Number.isFinite(startLine) ? startLine : 1,
                    column: Number.isFinite(startColumn) ? startColumn : 1,
                    offset: startOffset,
                },
                end: {
                    line: Number.isFinite(endLine) ? endLine : 1,
                    column: Number.isFinite(endColumn) ? endColumn : 1,
                    offset: endOffset,
                },
            };
        }

        // Handle simplified location shape: { start: number, end: number }
        const startOffset = Number(start);
        const endOffset = Number(end);
        if (!Number.isFinite(startOffset) || !Number.isFinite(endOffset) || startOffset >= endOffset) {
            return null;
        }

        return {
            start: { line: 1, column: 1, offset: startOffset },
            end: { line: 1, column: 1, offset: endOffset },
        };
    }

    private collectMiniLocationsFromPattern(pattern: StrudelPatternLike | undefined): StrudelMiniLocationDto[] | undefined {
        if (!pattern?.queryArc) return undefined;

        const dedup = new Map<string, StrudelMiniLocationDto>();
        const haps = pattern.queryArc(0, 32);

        for (const hap of haps) {
            const locations = hap.context?.locations;
            if (!locations || locations.length === 0) continue;

            for (const location of locations) {
                const start = location.start;
                const end = location.end;
                if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) continue;

                const key = `${start}:${end}`;
                if (dedup.has(key)) continue;

                dedup.set(key, {
                    start: { line: 1, column: 1, offset: start },
                    end: { line: 1, column: 1, offset: end },
                });
            }
        }

        if (dedup.size === 0) return undefined;
        return Array.from(dedup.values());
    }

    private collectHapsFromPattern(pattern: StrudelPatternLike | undefined, cycle: number): StrudelHapDto[] | undefined {
        if (!pattern?.queryArc) return undefined;

        const begin = Math.max(0, cycle - 1);
        const end = cycle + 0.5;
        const haps = pattern.queryArc(begin, end);
        const normalized: StrudelHapDto[] = [];

        for (const hap of haps) {
            const rawWholeBegin = hap.whole?.begin?.valueOf?.();
            const rawWholeEnd = hap.whole?.end?.valueOf?.();
            if (!Number.isFinite(rawWholeBegin) || !Number.isFinite(rawWholeEnd)) {
                continue;
            }

            const wholeBegin = Number(rawWholeBegin);
            const wholeEnd = Number(rawWholeEnd);
            if (wholeBegin >= wholeEnd) {
                continue;
            }

            const locations = (hap.context?.locations ?? [])
                .filter((location) => Number.isFinite(location.start) && Number.isFinite(location.end) && location.start < location.end)
                .map((location) => ({ start: location.start, end: location.end }));

            if (locations.length === 0) continue;

            normalized.push({
                begin: wholeBegin,
                end: wholeEnd,
                locations,
            });
        }

        return normalized.length > 0 ? normalized : undefined;
    }

    protected override sendMessage(message: StrudelRunnerToParentMessage): void {
        super.sendMessage(message);

        // Fallback channel for browsers where MessagePort runner->parent delivery is flaky.
        // Keep this limited to control/state messages to avoid duplicating high-rate FFT traffic.
        if (message.type !== 'STR_AUDIO_DATA') {
            this.postWindowMessage(message);
        }
    }

    private postWindowMessage(message: StrudelRunnerToParentMessage): void {
        if (window.parent === window) return;
        const targetOrigin = this.activeParentOrigin ?? (import.meta.env.DEV ? '*' : window.location.origin);
        window.parent.postMessage(
            {
                type: STRUDEL_WINDOW_EVENT_TYPE,
                message,
            },
            targetOrigin
        );
    }

    private handleWindowMessage = (event: MessageEvent<StrudelWindowToRunnerMessage | StrudelParentToRunnerMessage>): void => {
        if (event.source !== window.parent) return;
        if (!this.isAllowedOrigin(event.origin)) return;

        const data = event.data as unknown;
        if (isStrudelInitMessage(data)) {
            this.activeParentOrigin = event.origin;
            const port = event.ports?.[0];
            if (port) {
                this.attachPort(port, this.handlePortMessage as (event: MessageEvent) => void);
            }
            this.sendReady();
            return;
        }

        // Window-message fallback path when MessagePort is unavailable.
        if (isStrudelParentMessage(data) && (data.type === 'STR_INIT_AUDIO' || !this.messagePort)) {
            void this.handleParentMessage(data);
        }
    };

}
