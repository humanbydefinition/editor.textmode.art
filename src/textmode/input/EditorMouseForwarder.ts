import type { RunnerMouseEventPayload, RunnerMouseEventType } from '@textmode/runner-client';

const EXCLUDED_TARGET_SELECTOR =
	'#shell-container, [role="dialog"], [role="alertdialog"], [role="menu"], .toaster, [data-radix-portal], ' +
	'.find-widget, .suggest-widget, .monaco-hover, .context-view, .monaco-editor .monaco-aria-container';

export interface EditorMouseForwarderOptions {
	/** Container hosting Monaco editor */
	container: HTMLElement;
	/** Callback to send a mouse event to the runner */
	onSendMouseEvent: (event: RunnerMouseEventPayload) => void;
	/** Optional window reference for tests */
	windowTarget?: Window;
}

/**
 * Forwards mouse hover, clicks, and drags from the editor overlay to the
 * sandboxed runner canvas while the Monaco editor is open.
 *
 * High-frequency 'mousemove' events are coalesced using requestAnimationFrame,
 * while discrete state transitions ('mousedown', 'mouseup', 'click', 'dblclick', 'mouseleave')
 * are dispatched immediately.
 *
 * Clicks on floating UI widgets, modals, menus, and toasts are excluded.
 */
export class EditorMouseForwarder {
	private readonly container: HTMLElement;
	private readonly onSendMouseEvent: (event: RunnerMouseEventPayload) => void;
	private readonly targetWindow: Window;
	private readonly listenerController = new AbortController();

	private pendingMouseMove: RunnerMouseEventPayload | null = null;
	private rafId: number | null = null;
	private pressedButtons = 0;
	private disposed = false;

	constructor(options: EditorMouseForwarderOptions) {
		this.container = options.container;
		this.onSendMouseEvent = options.onSendMouseEvent;
		this.targetWindow = options.windowTarget ?? window;

		this.attachListeners();
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;

		this.cancelPendingRaf();
		this.listenerController.abort();
		this.releasePressedButtons();
	}

	private attachListeners(): void {
		const capture = { capture: true, passive: true, signal: this.listenerController.signal };
		const passive = { passive: true, signal: this.listenerController.signal };

		this.container.addEventListener('mousemove', this.handleMouseMove, capture);
		this.container.addEventListener('mousedown', this.handleImmediateEvent, capture);
		this.container.addEventListener('click', this.handleImmediateEvent, capture);
		this.container.addEventListener('dblclick', this.handleImmediateEvent, capture);
		this.container.addEventListener('mouseleave', this.handleMouseLeave, passive);
		this.targetWindow.addEventListener('mouseup', this.handleWindowMouseUp, capture);
		this.targetWindow.addEventListener('blur', this.handleWindowBlur, passive);
	}

	private isExcludedTarget(target: EventTarget | null): boolean {
		return target instanceof Element && target.closest(EXCLUDED_TARGET_SELECTOR) !== null;
	}

	private createPayload(event: MouseEvent, eventType: RunnerMouseEventType): RunnerMouseEventPayload {
		return {
			eventType,
			clientX: event.clientX,
			clientY: event.clientY,
			button: event.button,
			buttons: event.buttons,
			altKey: event.altKey,
			ctrlKey: event.ctrlKey,
			metaKey: event.metaKey,
			shiftKey: event.shiftKey,
		};
	}

	private handleMouseMove = (event: MouseEvent): void => {
		if (this.disposed) return;
		if (this.isExcludedTarget(event.target)) {
			this.cancelPendingRaf();
			return;
		}

		this.pendingMouseMove = this.createPayload(event, 'mousemove');

		if (this.rafId === null) {
			this.rafId = this.targetWindow.requestAnimationFrame(this.flushPendingMouseMove);
		}
	};

	private flushPendingMouseMove = (): void => {
		this.rafId = null;
		if (this.pendingMouseMove && !this.disposed) {
			const payload = this.pendingMouseMove;
			this.pendingMouseMove = null;
			this.onSendMouseEvent(payload);
		}
	};

	private cancelPendingRaf(): void {
		if (this.rafId !== null) {
			this.targetWindow.cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.pendingMouseMove = null;
	}

	private sendImmediate(event: MouseEvent, eventType: RunnerMouseEventType): void {
		if (this.pendingMouseMove) {
			this.cancelPendingRaf();
		}

		this.onSendMouseEvent(this.createPayload(event, eventType));
	}

	private handleImmediateEvent = (event: MouseEvent): void => {
		if (this.disposed || this.isExcludedTarget(event.target)) return;
		const eventType = event.type as RunnerMouseEventType;
		if (eventType === 'mousedown') this.pressedButtons = event.buttons;
		this.sendImmediate(event, eventType);
	};

	private handleWindowMouseUp = (event: MouseEvent): void => {
		if (this.disposed || this.pressedButtons === 0) return;
		this.pressedButtons = event.buttons;
		this.sendImmediate(event, 'mouseup');
	};

	private handleMouseLeave = (event: MouseEvent): void => {
		if (this.disposed) return;
		this.cancelPendingRaf();
		this.onSendMouseEvent(this.createPayload(event, 'mouseleave'));
	};

	private handleWindowBlur = (): void => {
		if (this.disposed) return;
		this.cancelPendingRaf();
		this.releasePressedButtons();
	};

	private releasePressedButtons(): void {
		if (this.pressedButtons === 0) return;
		this.pressedButtons = 0;
		this.onSendMouseEvent({ eventType: 'mouseup', clientX: 0, clientY: 0, button: 0, buttons: 0 });
	}
}
