import { useCallback, useEffect, useRef, useState } from 'react';
import { buildLegalHref } from '@/shared/config/appMeta';
import {
	type AnalyticsConsentDecision,
	loadGoogleAnalyticsAfterConsent,
	onAnalyticsConsentPreferencesOpen,
	readAnalyticsConsent,
	revokeGoogleAnalytics,
	writeAnalyticsConsent,
} from '../model/analytics-consent';
import './AnalyticsConsentBanner.css';

const TRANSITION_MS = 220;

export function AnalyticsConsentBanner() {
	const [initialDecision] = useState(() => readAnalyticsConsent());
	const [rendered, setRendered] = useState(() => initialDecision === null);
	const [active, setActive] = useState(() => initialDecision === null);
	const transitionTimerRef = useRef<number | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	const clearTransitionHandles = useCallback(() => {
		if (transitionTimerRef.current !== null) {
			window.clearTimeout(transitionTimerRef.current);
			transitionTimerRef.current = null;
		}

		if (animationFrameRef.current !== null) {
			window.cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
	}, []);

	const showBanner = useCallback(() => {
		clearTransitionHandles();
		setRendered(true);
		animationFrameRef.current = window.requestAnimationFrame(() => {
			setActive(true);
			animationFrameRef.current = null;
		});
	}, [clearTransitionHandles]);

	const hideBanner = useCallback(() => {
		clearTransitionHandles();
		setActive(false);
		transitionTimerRef.current = window.setTimeout(() => {
			setRendered(false);
			transitionTimerRef.current = null;
		}, TRANSITION_MS);
	}, [clearTransitionHandles]);

	useEffect(() => {
		const unsubscribe = onAnalyticsConsentPreferencesOpen(showBanner);
		const decision = readAnalyticsConsent();

		if (decision === 'accepted') {
			loadGoogleAnalyticsAfterConsent();
		} else if (decision === 'rejected') {
			revokeGoogleAnalytics();
		}

		return () => {
			unsubscribe();
			clearTransitionHandles();
		};
	}, [clearTransitionHandles, showBanner]);

	const commitDecision = useCallback(
		(decision: AnalyticsConsentDecision) => {
			writeAnalyticsConsent(decision);

			if (decision === 'accepted') {
				loadGoogleAnalyticsAfterConsent();
			} else {
				revokeGoogleAnalytics();
			}

			hideBanner();
		},
		[hideBanner]
	);

	if (!rendered) return null;

	return (
		<section
			role="region"
			aria-live="polite"
			aria-labelledby="analytics-consent-title"
			aria-describedby="analytics-consent-description"
			className="analytics-consent"
			data-state={active ? 'open' : 'closed'}
		>
			<div className="analytics-consent__content">
				<h2 id="analytics-consent-title" className="analytics-consent__title">
					Analytics preferences
				</h2>
				<p id="analytics-consent-description" className="analytics-consent__body">
					We use Google Analytics to improve editor.textmode.art. Analytics only run if you allow it.
				</p>
				<a
					href={buildLegalHref('privacy')}
					target="_blank"
					rel="noreferrer noopener"
					className="analytics-consent__link"
				>
					Data protection policy
				</a>
			</div>
			<div className="analytics-consent__actions" aria-label="Analytics consent choices">
				<button
					type="button"
					className="analytics-consent__button analytics-consent__button--secondary"
					onClick={() => commitDecision('rejected')}
				>
					Reject analytics
				</button>
				<button
					type="button"
					className="analytics-consent__button analytics-consent__button--primary"
					onClick={() => commitDecision('accepted')}
				>
					Allow analytics
				</button>
			</div>
		</section>
	);
}
