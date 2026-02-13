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
    type StrudelParentToRunnerMessage,
    type StrudelRunnerToParentMessage,
    type StrudelWindowToRunnerMessage,
} from './protocol';

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

export class StrudelRunner {
    private messagePort: MessagePort | null = null;
    private readonly allowedParentOrigins: Set<string>;
    private repl: StrudelReplLike | null = null;
    private currentPattern: StrudelPatternLike | null = null;
    private runtimeInitPromise: Promise<void> | null = null;
    private runtimeInitialized = false;
    private audioInitialized = false;
    private isPlaying = false;
    private cycleBroadcastTimer: number | null = null;

    constructor() {
        this.allowedParentOrigins = new Set(this.getAllowedParentOrigins());
    }

    start(): void {
        this.setupErrorHandlers();
        window.addEventListener('message', this.handleInitMessage);
    }

    private handleInitMessage = (event: MessageEvent<StrudelWindowToRunnerMessage>): void => {
        if (!isStrudelInitMessage(event.data)) return;
        if (!this.isAllowedOrigin(event.origin)) return;
        if (event.source !== window.parent) return;
        const port = event.ports?.[0];
        if (!port) return;

        this.attachPort(port);
        window.removeEventListener('message', this.handleInitMessage);
        this.sendReady();
    };

    private handlePortMessage = (event: MessageEvent<StrudelParentToRunnerMessage>): void => {
        const message = event.data;
        if (!isStrudelParentMessage(message)) return;

        void this.handleParentMessage(message);
    };

    private async handleParentMessage(message: StrudelParentToRunnerMessage): Promise<void> {
        switch (message.type) {
            case 'STR_INIT_AUDIO':
                await this.initializeAudio();
                this.sendReady();
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

    private async initializeAudio(): Promise<void> {
        try {
            await this.ensureRuntimeInitialized();
            await initAudio();
            this.audioInitialized = true;
        } catch (error) {
            this.sendRunError(error);
        }
    }

    private async runCode(code: string, autostart: boolean): Promise<void> {
        try {
            await this.ensureRuntimeInitialized();
            if (!this.audioInitialized) {
                await this.initializeAudio();
            }

            const evaluatedPattern = await evaluateStrudel(code, autostart) as StrudelPatternLike;

            this.isPlaying = autostart;
            if (this.isPlaying) {
                this.startCycleBroadcast();
            } else {
                this.stopCycleBroadcast();
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
            this.stopCycleBroadcast();
            this.sendPlayState();
        }
    }

    private dispose(): void {
        this.hush();
        this.stopCycleBroadcast();
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

    private sendMessage(message: StrudelRunnerToParentMessage): void {
        if (!this.messagePort) return;
        this.messagePort.postMessage(message);
    }

    private attachPort(port: MessagePort): void {
        if (this.messagePort) {
            this.messagePort.close();
        }
        this.messagePort = port;
        this.messagePort.onmessage = this.handlePortMessage;
        this.messagePort.start();
    }

    private setupErrorHandlers(): void {
        window.addEventListener('error', (event) => {
            this.sendRunError(event.error ?? event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.sendRunError(event.reason);
        });
    }

    private isAllowedOrigin(origin: string): boolean {
        if (this.allowedParentOrigins.has('*')) return true;
        return this.allowedParentOrigins.has(origin);
    }

    private getAllowedParentOrigins(): string[] {
        const raw = import.meta.env.VITE_RUNNER_PARENT_ORIGINS;
        if (!raw || typeof raw !== 'string') {
            if (import.meta.env.DEV) return ['*'];
            return [];
        }

        return raw
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value.length > 0);
    }
}
