export const STRUDEL_PROTOCOL_VERSION = 1;

export interface StrudelInitMessage {
    type: 'STR_INIT';
    v: typeof STRUDEL_PROTOCOL_VERSION;
}

export interface StrudelInitAudioMessage {
    type: 'STR_INIT_AUDIO';
}

export interface StrudelRunCodeMessage {
    type: 'STR_RUN_CODE';
    code: string;
    autostart?: boolean;
}

export interface StrudelHushMessage {
    type: 'STR_HUSH';
}

export interface StrudelDisposeMessage {
    type: 'STR_DISPOSE';
}

export type StrudelParentToRunnerMessage =
    | StrudelInitAudioMessage
    | StrudelRunCodeMessage
    | StrudelHushMessage
    | StrudelDisposeMessage;

export interface StrudelMiniLocationDto {
    start: { line: number; column: number; offset: number };
    end: { line: number; column: number; offset: number };
}

export interface StrudelHapDto {
    begin: number;
    end: number;
    locations: Array<{ start: number; end: number }>;
}

export interface StrudelReadyMessage {
    type: 'STR_READY';
    runtimeInitialized: boolean;
    audioInitialized: boolean;
}

export interface StrudelRunOkMessage {
    type: 'STR_RUN_OK';
    timestamp: number;
    miniLocations?: StrudelMiniLocationDto[];
    haps?: StrudelHapDto[];
    cycle?: number;
    isPlaying: boolean;
}

export interface StrudelRunErrorMessage {
    type: 'STR_RUN_ERROR';
    message: string;
    stack?: string;
    line?: number;
    column?: number;
}

export interface StrudelPlayStateMessage {
    type: 'STR_PLAY_STATE';
    isPlaying: boolean;
    cycle?: number;
    haps?: StrudelHapDto[];
}

export type StrudelRunnerToParentMessage =
    | StrudelReadyMessage
    | StrudelRunOkMessage
    | StrudelRunErrorMessage
    | StrudelPlayStateMessage;

export type StrudelWindowToRunnerMessage = StrudelInitMessage;

export function isStrudelInitMessage(msg: unknown): msg is StrudelInitMessage {
    if (typeof msg !== 'object' || msg === null) return false;
    const candidate = msg as { type?: string; v?: number };
    return candidate.type === 'STR_INIT' && candidate.v === STRUDEL_PROTOCOL_VERSION;
}

export function isStrudelParentMessage(msg: unknown): msg is StrudelParentToRunnerMessage {
    if (typeof msg !== 'object' || msg === null) return false;
    const candidate = msg as { type?: string };
    return (
        candidate.type === 'STR_INIT_AUDIO' ||
        candidate.type === 'STR_RUN_CODE' ||
        candidate.type === 'STR_HUSH' ||
        candidate.type === 'STR_DISPOSE'
    );
}
