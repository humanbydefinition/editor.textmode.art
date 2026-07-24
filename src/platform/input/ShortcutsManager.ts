import { isHardResetShortcut } from './shortcuts';

/**
 * Actions that can be triggered by keyboard shortcuts.
 */
export interface ShortcutActions {
	/** Change font size by delta (+1 or -1) */
	changeFontSize: (delta: number) => void;
	/** Toggle auto-execute setting */
	toggleAutoExecute: () => void;
	/** Toggle backdrop setting */
	toggleEditorBackdrop: () => void;
	/** Toggle UI visibility */
	toggleUIVisibility: () => void;
	/** Recreate the textmode runtime in the current iframe and run the current code */
	hardReset: () => void;
}

/**
 * Configuration for the shortcuts manager.
 */
export interface ShortcutsManagerOptions {
	/** Actions to trigger on shortcuts */
	actions: ShortcutActions;
}

/**
 * Shortcuts Manager implementation.
 */
export class ShortcutsManager {
	private readonly actions: ShortcutActions;
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	constructor(options: ShortcutsManagerOptions) {
		this.actions = options.actions;
	}

	/**
	 * Initialize keyboard shortcuts.
	 */
	init(): void {
		this.keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e);
		window.addEventListener('keydown', this.keydownHandler, true);
	}

	/**
	 * Cleanup resources.
	 */
	dispose(): void {
		if (this.keydownHandler) {
			window.removeEventListener('keydown', this.keydownHandler, true);
			this.keydownHandler = null;
		}
	}

	/**
	 * Handle keydown events.
	 */
	private handleKeydown(e: KeyboardEvent): void {
		// Reset sketch runtime: Ctrl + Shift + R
		if (isHardResetShortcut(e)) {
			e.preventDefault();
			e.stopPropagation();
			this.actions.hardReset();
			return;
		}

		// Font size shortcuts: Ctrl + Shift + +/-
		if (e.ctrlKey && e.shiftKey && (e.key === '+' || e.key === '=' || e.key === '_' || e.key === '-')) {
			e.preventDefault();
			const delta = e.key === '+' || e.key === '=' ? 1 : -1;
			this.actions.changeFontSize(delta);
		}

		// Toggle auto-execute: Ctrl + E
		if (e.ctrlKey && e.key === 'e') {
			e.preventDefault();
			this.actions.toggleAutoExecute();
		}

		// Toggle text background: Ctrl + B
		if (e.ctrlKey && e.key === 'b') {
			e.preventDefault();
			this.actions.toggleEditorBackdrop();
		}

		// Toggle UI visibility: Ctrl + Shift + H
		if (e.ctrlKey && e.shiftKey && e.key === 'H') {
			e.preventDefault();
			this.actions.toggleUIVisibility();
		}
	}
}
