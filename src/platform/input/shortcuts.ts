export interface ShortcutKeyEvent {
	altKey: boolean;
	code: string;
	ctrlKey: boolean;
	metaKey: boolean;
	repeat: boolean;
	shiftKey: boolean;
}

export function isHardResetShortcut(event: ShortcutKeyEvent): boolean {
	return event.code === 'KeyR' && event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && !event.repeat;
}
