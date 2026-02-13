declare global {
	interface Window {
		turnstile?: {
			render: (
				container: string | HTMLElement,
				options: {
					sitekey: string;
					theme?: 'light' | 'dark' | 'auto';
					size?: 'normal' | 'compact' | 'flexible';
					callback?: (token: string) => void;
					'error-callback'?: () => void;
					'expired-callback'?: () => void;
				}
			) => string;
			reset: (widgetId?: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

export {};
