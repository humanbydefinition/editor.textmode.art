import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
	type AnalyticsConsentDecision,
	disableUmamiAnalytics,
	enableUmamiAnalytics,
	onAnalyticsConsentPreferencesOpen,
	readStoredAnalyticsConsent,
	writeStoredAnalyticsConsent,
} from '../model/analytics-consent';
import { buildLegalHref } from '@/shared/config/appMeta';
import './AnalyticsConsentBanner.css';

const TRANSITION_MS = 220;

export function AnalyticsConsentBanner() {
	const [rendered, setRendered] = useState(false);
	const [active, setActive] = useState(false);
	const fallbackDecision = useRef<AnalyticsConsentDecision | null>(null);
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

	const readDecision = useCallback((): AnalyticsConsentDecision | null => {
		return readStoredAnalyticsConsent() ?? fallbackDecision.current;
	}, []);

	useEffect(() => {
		const unsubscribe = onAnalyticsConsentPreferencesOpen(() => {
			showBanner();
		});
		const decision = readDecision();

		if (decision === 'accepted') {
			enableUmamiAnalytics();
		} else if (decision === 'rejected') {
			disableUmamiAnalytics();
		} else {
			showBanner();
		}

		return () => {
			unsubscribe();
			clearTransitionHandles();
		};
	}, [clearTransitionHandles, readDecision, showBanner]);

	const commitDecision = useCallback(
		(decision: AnalyticsConsentDecision) => {
			fallbackDecision.current = decision;
			writeStoredAnalyticsConsent(decision);

			if (decision === 'accepted') {
				enableUmamiAnalytics();
			} else {
				disableUmamiAnalytics();
			}

			hideBanner();
		},
		[hideBanner]
	);

	if (!rendered) {
		return null;
	}

	const content = (
		<section
			role="region"
			aria-labelledby="analytics-consent-title"
			aria-describedby="analytics-consent-description"
			className="analytics-consent"
			data-state={active ? 'open' : 'closed'}
		>
			<div className="analytics-consent__content">
				<h2 id="analytics-consent-title" className="analytics-consent__title">
					Analytics preferences
				</h2>
				<p
					id="analytics-consent-description"
					className="analytics-consent__body"
				>
					We use privacy-friendly analytics, hosted on our own server, to
					improve synth.textmode.art. It only runs if you allow analytics.
				</p>
				<a
					href={buildLegalHref('privacy')}
					target="_blank"
					rel="noopener noreferrer"
					className="analytics-consent__link"
				>
					Data protection policy
				</a>
			</div>
			<div
				className="analytics-consent__actions"
				aria-label="Analytics consent choices"
			>
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

	return createPortal(content, document.body);
}
