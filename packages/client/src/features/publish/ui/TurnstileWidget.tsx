import { useEffect, useRef } from 'react';
import { cn } from '@/shared/lib/cn';

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_SCRIPT_ATTR = 'data-turnstile-script';
const TURNSTILE_LOAD_TIMEOUT_MS = 5000;

let turnstileScriptPromise: Promise<void> | null = null;

function waitForTurnstile(timeoutMs: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const startedAt = Date.now();

		const poll = (): void => {
			if (window.turnstile) {
				resolve();
				return;
			}

			if (Date.now() - startedAt >= timeoutMs) {
				reject(new Error('Timed out while loading Turnstile.'));
				return;
			}

			window.setTimeout(poll, 50);
		};

		poll();
	});
}

async function loadTurnstileScript(): Promise<void> {
	if (typeof window === 'undefined') {
		return;
	}

	if (window.turnstile) {
		return;
	}

	if (turnstileScriptPromise) {
		return turnstileScriptPromise;
	}

	turnstileScriptPromise = new Promise<void>((resolve, reject) => {
		const existingScript = document.querySelector(`script[${TURNSTILE_SCRIPT_ATTR}="true"]`) as
			| HTMLScriptElement
			| null;

		if (existingScript) {
			waitForTurnstile(TURNSTILE_LOAD_TIMEOUT_MS)
				.then(resolve)
				.catch((error) => {
					turnstileScriptPromise = null;
					reject(error);
				});
			return;
		}

		const script = document.createElement('script');
		script.src = TURNSTILE_SCRIPT_SRC;
		script.async = true;
		script.defer = true;
		script.setAttribute(TURNSTILE_SCRIPT_ATTR, 'true');
		script.onload = () => {
			waitForTurnstile(TURNSTILE_LOAD_TIMEOUT_MS)
				.then(resolve)
				.catch((error) => {
					turnstileScriptPromise = null;
					reject(error);
				});
		};
		script.onerror = () => {
			turnstileScriptPromise = null;
			reject(new Error('Failed to load Turnstile script.'));
		};
		document.head.appendChild(script);
	});

	return turnstileScriptPromise;
}

export interface TurnstileWidgetProps {
	siteKey: string;
	resetNonce: number;
	onTokenChange: (token: string | null) => void;
	onErrorChange: (error: string | null) => void;
	className?: string;
}

export function TurnstileWidget({
	siteKey,
	resetNonce,
	onTokenChange,
	onErrorChange,
	className,
}: TurnstileWidgetProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const widgetIdRef = useRef<string | null>(null);

	useEffect(() => {
		let disposed = false;

		const cleanupWidget = (): void => {
			if (widgetIdRef.current && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
				widgetIdRef.current = null;
			}
		};

		const mountWidget = async (): Promise<void> => {
			onTokenChange(null);
			onErrorChange(null);

			try {
				await loadTurnstileScript();
				if (disposed || !containerRef.current || !window.turnstile) {
					return;
				}

				cleanupWidget();

				widgetIdRef.current = window.turnstile.render(containerRef.current, {
					sitekey: siteKey,
					theme: 'dark',
					callback: (token) => {
						if (disposed) return;
						onTokenChange(token);
						onErrorChange(null);
					},
					'expired-callback': () => {
						if (disposed) return;
						onTokenChange(null);
						onErrorChange('Security verification expired. Please complete it again.');
						if (widgetIdRef.current && window.turnstile) {
							window.turnstile.reset(widgetIdRef.current);
						}
					},
					'error-callback': () => {
						if (disposed) return;
						onTokenChange(null);
						onErrorChange('Security verification failed to load. Please retry.');
					},
				});
			} catch {
				if (disposed) return;
				onTokenChange(null);
				onErrorChange('Security verification failed to load. Please disable blockers and retry.');
			}
		};

		void mountWidget();

		return () => {
			disposed = true;
			cleanupWidget();
		};
	}, [siteKey, resetNonce, onTokenChange, onErrorChange]);

	return (
		<div className={cn('min-h-[65px] w-full', className)}>
			<div ref={containerRef} />
		</div>
	);
}
