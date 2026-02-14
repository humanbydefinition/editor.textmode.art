export const SLUG_INFO_POPOVER_DISMISS_EVENT = 'synth:slug-info-popover-dismiss';
export const STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT = 'synth:strudel-unlock-popover-dismiss';
export const STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT = 'synth:strudel-unlock-popover-suppress';
export const STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT = 'synth:strudel-unlock-popover-allow';

export function emitSlugInfoPopoverDismiss(): void {
	window.dispatchEvent(new Event(SLUG_INFO_POPOVER_DISMISS_EVENT));
}

export function emitStrudelUnlockPopoverDismiss(): void {
	window.dispatchEvent(new Event(STRUDEL_UNLOCK_POPOVER_DISMISS_EVENT));
}

export function emitStrudelUnlockPopoverSuppress(): void {
	window.dispatchEvent(new Event(STRUDEL_UNLOCK_POPOVER_SUPPRESS_EVENT));
}

export function emitStrudelUnlockPopoverAllow(): void {
	window.dispatchEvent(new Event(STRUDEL_UNLOCK_POPOVER_ALLOW_EVENT));
}
