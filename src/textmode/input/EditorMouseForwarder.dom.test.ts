import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { RunnerMouseEventPayload } from '@textmode/runner-client';
import { EditorMouseForwarder } from './EditorMouseForwarder';

describe('EditorMouseForwarder', () => {
	let container: HTMLDivElement;
	let onSendMouseEvent: Mock<(event: RunnerMouseEventPayload) => void>;
	let forwarder: EditorMouseForwarder | null = null;

	beforeEach(() => {
		container = document.createElement('div');
		container.id = 'editor-panel-textmode';
		document.body.appendChild(container);
		onSendMouseEvent = vi.fn();
	});

	afterEach(() => {
		forwarder?.dispose();
		forwarder = null;
		container.remove();
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it('coalesces high-frequency mousemove events using requestAnimationFrame', () => {
		let rafCallback: ((time: number) => void) | null = null;
		const fakeWindow = {
			addEventListener: window.addEventListener.bind(window),
			removeEventListener: window.removeEventListener.bind(window),
			requestAnimationFrame: vi.fn((cb: (time: number) => void) => {
				rafCallback = cb;
				return 101;
			}),
			cancelAnimationFrame: vi.fn(),
		} as unknown as Window;

		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
			windowTarget: fakeWindow,
		});

		container.dispatchEvent(
			new MouseEvent('mousemove', {
				clientX: 10,
				clientY: 20,
				bubbles: true,
			})
		);

		container.dispatchEvent(
			new MouseEvent('mousemove', {
				clientX: 30,
				clientY: 40,
				bubbles: true,
			})
		);

		expect(fakeWindow.requestAnimationFrame).toHaveBeenCalledTimes(1);
		expect(onSendMouseEvent).not.toHaveBeenCalled();

		// Execute animation frame
		expect(rafCallback).toBeDefined();
		(rafCallback as unknown as (time: number) => void)(16);

		expect(onSendMouseEvent).toHaveBeenCalledTimes(1);
		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'mousemove',
				clientX: 30,
				clientY: 40,
			})
		);
	});

	it('drops a queued mousemove after entering an excluded widget', () => {
		let rafCallback: (() => void) | null = null;
		const fakeWindow = {
			addEventListener: window.addEventListener.bind(window),
			removeEventListener: window.removeEventListener.bind(window),
			requestAnimationFrame: vi.fn((callback: () => void) => {
				rafCallback = callback;
				return 101;
			}),
			cancelAnimationFrame: vi.fn(),
		} as unknown as Window;
		forwarder = new EditorMouseForwarder({ container, onSendMouseEvent, windowTarget: fakeWindow });

		container.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		const widget = document.createElement('div');
		widget.className = 'find-widget';
		container.appendChild(widget);
		widget.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
		(rafCallback as (() => void) | null)?.();

		expect(fakeWindow.cancelAnimationFrame).toHaveBeenCalledWith(101);
		expect(onSendMouseEvent).not.toHaveBeenCalled();
	});

	it('dispatches mousedown and click immediately', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		container.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 50,
				clientY: 60,
				button: 0,
				buttons: 1,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'mousedown',
				clientX: 50,
				clientY: 60,
				button: 0,
				buttons: 1,
			})
		);

		container.dispatchEvent(
			new MouseEvent('click', {
				clientX: 50,
				clientY: 60,
				button: 0,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'click',
				clientX: 50,
				clientY: 60,
				button: 0,
			})
		);
	});

	it('dispatches window mouseup when mouse was pressed', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		// mousedown inside container
		container.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 70,
				clientY: 80,
				button: 0,
				buttons: 1,
				bubbles: true,
			})
		);

		// mouseup on window outside container
		window.dispatchEvent(
			new MouseEvent('mouseup', {
				clientX: 200,
				clientY: 300,
				button: 0,
				buttons: 0,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'mouseup',
				clientX: 200,
				clientY: 300,
			})
		);
	});

	it('forwards each release in a multi-button drag', () => {
		forwarder = new EditorMouseForwarder({ container, onSendMouseEvent });
		container.dispatchEvent(new MouseEvent('mousedown', { button: 0, buttons: 3, bubbles: true }));

		window.dispatchEvent(new MouseEvent('mouseup', { button: 0, buttons: 2 }));
		window.dispatchEvent(new MouseEvent('mouseup', { button: 2, buttons: 0 }));

		expect(onSendMouseEvent.mock.calls.filter(([event]) => event.eventType === 'mouseup')).toHaveLength(2);
	});

	it('ignores mouse events originating from interactive UI overlays', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		const shell = document.createElement('div');
		shell.id = 'shell-container';
		const shellButton = document.createElement('button');
		shell.appendChild(shellButton);
		container.appendChild(shell);

		shellButton.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 10,
				clientY: 10,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).not.toHaveBeenCalled();
	});

	it('ignores mouse events originating from Monaco floating widgets', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		const findWidget = document.createElement('div');
		findWidget.className = 'find-widget';
		const findInput = document.createElement('input');
		findWidget.appendChild(findInput);
		container.appendChild(findWidget);

		findInput.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 100,
				clientY: 50,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).not.toHaveBeenCalled();
	});

	it('handles mouseleave by sending mouseleave event', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		container.dispatchEvent(
			new MouseEvent('mouseleave', {
				clientX: 0,
				clientY: 0,
				bubbles: false,
			})
		);

		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'mouseleave',
				clientX: 0,
				clientY: 0,
			})
		);
	});

	it('does not treat a descendant mouseleave as leaving the editor', () => {
		forwarder = new EditorMouseForwarder({ container, onSendMouseEvent });
		const child = document.createElement('div');
		container.appendChild(child);

		child.dispatchEvent(new MouseEvent('mouseleave'));

		expect(onSendMouseEvent).not.toHaveBeenCalled();
	});

	it('resets pressed state on window blur', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		container.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 50,
				clientY: 50,
				button: 0,
				buttons: 1,
				bubbles: true,
			})
		);

		window.dispatchEvent(new Event('blur'));

		expect(onSendMouseEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'mouseup',
			})
		);
	});

	it('stops sending events after disposal', () => {
		forwarder = new EditorMouseForwarder({
			container,
			onSendMouseEvent,
		});

		forwarder.dispose();

		container.dispatchEvent(
			new MouseEvent('mousedown', {
				clientX: 10,
				clientY: 20,
				bubbles: true,
			})
		);

		expect(onSendMouseEvent).not.toHaveBeenCalled();
	});
});
