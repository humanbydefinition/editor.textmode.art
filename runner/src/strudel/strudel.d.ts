declare module '@strudel/core' {
    export interface MiniLocation {
        start: { line: number; column: number; offset: number };
        end: { line: number; column: number; offset: number };
    }
}

declare module '@strudel/web' {
    export interface StrudelInitOptions {
        autostart?: boolean;
        onEvalError?: (error: Error) => void;
        prebake?: () => Promise<void>;
    }

    export interface StrudelReplLike {
        scheduler?: {
            now: () => number;
        };
        state?: {
            miniLocations?: import('@strudel/core').MiniLocation[];
        };
        stop?: () => void;
    }

    export function initStrudel(options?: StrudelInitOptions): Promise<StrudelReplLike>;
    export function initAudio(): Promise<void>;
    export function samples(config: string | object): Promise<void>;
    export function registerZZFXSounds(): Promise<void>;
    export function evaluate(code: string, autoplay?: boolean): Promise<unknown>;
    export function hush(): void;
}
