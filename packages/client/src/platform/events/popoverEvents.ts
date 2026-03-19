export const SLUG_INFO_POPOVER_DISMISS_EVENT = 'synth:slug-info-popover-dismiss';

export function emitSlugInfoPopoverDismiss(): void {
	window.dispatchEvent(new Event(SLUG_INFO_POPOVER_DISMISS_EVENT));
}
