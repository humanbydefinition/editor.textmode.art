import * as monaco from 'monaco-editor';
import type { Pattern, Hap } from '@strudel/core';

export type { Pattern };

export interface StrudelHighlighterOptions {
	editor: monaco.editor.IStandaloneCodeEditor;
	/** Lookahead time in cycles for querying pattern */
	lookahead?: number;
}

interface ActiveDecoration {
	decorationId: string;
	hapEnd: number;
}

/**
 * StrudelHighlighter manages real-time code highlighting
 * synchronized with pattern playback.
 */
export class StrudelHighlighter {
	private editor: monaco.editor.IStandaloneCodeEditor;
	private pattern: Pattern | null = null;
	private getCycle: (() => number) | null = null;
	private animationFrameId: number | null = null;
	private activeDecorations: Map<string, ActiveDecoration> = new Map();
	private lookahead: number;
	private isRunning = false;

	private static readonly HIGHLIGHT_CLASS = 'strudel-highlight-active';

	constructor(options: StrudelHighlighterOptions) {
		this.editor = options.editor;
		this.lookahead = options.lookahead ?? 0.1;
	}

	/**
	 * Set the current pattern and time functions from the Strudel scheduler
	 */
	setPattern(pattern: Pattern | null, _getTime: () => number, getCycle: () => number): void {
		this.pattern = pattern;
		this.getCycle = getCycle;
		this.clearAllHighlights();
	}

	/**
	 * Start the highlight animation loop
	 */
	start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.animate();
	}

	/**
	 * Stop the highlight animation loop
	 */
	stop(): void {
		this.isRunning = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		this.clearAllHighlights();
	}

	/**
	 * Clear all current highlights
	 */
	clearAllHighlights(): void {
		const model = this.editor.getModel();
		if (model) {
			const decorationIds = Array.from(this.activeDecorations.values()).map((d) => d.decorationId);
			if (decorationIds.length > 0) {
				model.deltaDecorations(decorationIds, []);
			}
		}
		this.activeDecorations.clear();
	}

	/**
	 * Main animation loop
	 */
	private animate = (): void => {
		if (!this.isRunning) return;

		this.updateHighlights();
		this.animationFrameId = requestAnimationFrame(this.animate);
	};

	/**
	 * Query pattern for current haps and update editor decorations.
	 */
	private updateHighlights(): void {
		const model = this.editor.getModel();

		if (!model || !this.pattern || !this.getCycle) {
			return;
		}

		try {
			const currentCycle = this.getCycle();
			const docLength = model.getValueLength();

			// Track which locations should be active this frame
			const activeLocationsThisFrame = new Map<
				string,
				{ offset: { start: number; end: number }; hapEnd: number }
			>();

			// Query pattern for haps around current time
			const haps = this.pattern.queryArc(
				Math.max(0, currentCycle - 1),
				currentCycle + this.lookahead
			);

			// Find all haps that are currently active
			for (const hap of haps) {
				if (!hap.whole) continue;

				const hapBegin = hap.whole.begin.valueOf();
				const hapEnd = hap.whole.end.valueOf();

				// Check if this hap is currently active
				if (currentCycle >= hapBegin && currentCycle < hapEnd) {
					this.processHapLocations(hap, hapEnd, activeLocationsThisFrame, docLength);
				}
			}

			// Remove decorations for locations that are no longer active
			const toRemove: string[] = [];
			const decorationIdsToRemove: string[] = [];

			for (const [key, decoration] of this.activeDecorations) {
				if (!activeLocationsThisFrame.has(key)) {
					toRemove.push(key);
					decorationIdsToRemove.push(decoration.decorationId);
				}
			}

			if (decorationIdsToRemove.length > 0) {
				model.deltaDecorations(decorationIdsToRemove, []);
				for (const key of toRemove) {
					this.activeDecorations.delete(key);
				}
			}

			// Add decorations for newly active locations
			for (const [key, { offset, hapEnd }] of activeLocationsThisFrame) {
				if (!this.activeDecorations.has(key)) {
					this.addDecorationByOffset(model, offset.start, offset.end, key, hapEnd);
				}
			}
		} catch (error) {
			console.debug('[StrudelHighlighter] Query error:', error);
		}
	}

	/**
	 * Process locations from a hap and add valid ones to active highlights.
	 * Uses hap.context.locations with smart filtering for stale/invalid locations.
	 */
	private processHapLocations(
		hap: Hap,
		hapEnd: number,
		activeLocations: Map<string, { offset: { start: number; end: number }; hapEnd: number }>,
		docLength: number
	): void {
		// Primary strategy: Use hap.context.locations if available
		if (hap.context?.locations && hap.context.locations.length > 0) {
			for (const location of hap.context.locations) {
				// Validate location bounds
				if (location.start < 0 || location.end > docLength || location.start >= location.end) {
					continue;
				}

				// Filter out locations that are almost certainly from .analyze() or similar
				// These appear as very short spans (typically "analyze" string length ~7-10 chars)
				// starting at offset 0 or very close to it
				// The key insight: .analyze() creates its own haps with locations pointing to
				// the analyze function call, which is usually at offset 0 after code transformation
				const isLikelyAnalyzeArtifact =
					location.start === 0 && location.end <= 10;

				if (isLikelyAnalyzeArtifact) {
					continue;
				}

				const key = `${location.start}:${location.end}`;
				const existing = activeLocations.get(key);
				if (!existing || hapEnd > existing.hapEnd) {
					activeLocations.set(key, {
						offset: { start: location.start, end: location.end },
						hapEnd,
					});
				}
			}
		}
	}

	/**
	 * Add a decoration at the specified character offset range
	 */
	private addDecorationByOffset(
		model: monaco.editor.ITextModel,
		startOffset: number,
		endOffset: number,
		key: string,
		hapEnd: number
	): void {
		const docLength = model.getValueLength();
		if (startOffset < 0 || endOffset > docLength || startOffset >= endOffset) {
			return;
		}

		const startPos = model.getPositionAt(startOffset);
		const endPos = model.getPositionAt(endOffset);
		const range = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);

		const newDecoration: monaco.editor.IModelDeltaDecoration = {
			range,
			options: {
				className: StrudelHighlighter.HIGHLIGHT_CLASS,
				inlineClassName: StrudelHighlighter.HIGHLIGHT_CLASS,
				stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
			},
		};

		const ids = model.deltaDecorations([], [newDecoration]);

		if (ids.length > 0) {
			this.activeDecorations.set(key, {
				decorationId: ids[0],
				hapEnd,
			});
		}
	}

	/**
	 * Dispose of the highlighter
	 */
	dispose(): void {
		this.stop();
	}
}

/**
 * Inject global Strudel highlight styles (called once on init)
 */
export function injectStrudelHighlightStyles(): void {
	if (document.getElementById('strudel-highlight-styles')) return;

	const style = document.createElement('style');
	style.id = 'strudel-highlight-styles';
	style.textContent = `
        .strudel-highlight-active {
            background-color: rgba(117, 186, 255, 0.2);
            outline: 1.5px solid rgba(117, 186, 255, 0.9);
            outline-offset: 1px;
            box-shadow: 
                0 0 6px rgba(117, 186, 255, 0.8),
                0 0 12px rgba(117, 186, 255, 0.4),
                0 0 20px rgba(117, 186, 255, 0.2);
            border-radius: 2px;
        }
    `;
	document.head.appendChild(style);
}
