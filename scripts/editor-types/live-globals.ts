export const LIVE_GLOBALS_CONTENT = `import 'textmode.synth.js';
import 'textmode.filters.js';
import 'textmode.export.js';
import 'textmode.figlet.js';
import type { Textmodifier } from 'textmode.js';
import type { EasingFunction } from 'textmode.synth.js';

declare global {
  // Main Textmode Instance
  const t: Textmodifier;

  interface AudioAnalysis {
    fft(): Uint8Array;
    waveform(): Uint8Array;
    bass(): number;
    mid(): number;
    high(): number;
    volume(): number;
    timestamp(): number;
    hasData(): boolean;
  }

  // Latest external audio input analysis frame
  const audio: AudioAnalysis;

  // Bundled plugin globals
  const SynthPlugin: typeof import('textmode.synth.js').SynthPlugin;
  const FiltersPlugin: typeof import('textmode.filters.js').FiltersPlugin;
  const ExportPlugin: typeof import('textmode.export.js').ExportPlugin;
  const FigletPlugin: typeof import('textmode.figlet.js').FigletPlugin;
  
  // Bundled library globals
  const SynthSource: typeof import('textmode.synth.js').SynthSource;
  const TextmodeFigFont: typeof import('textmode.figlet.js').TextmodeFigFont;
  const FigFontParser: typeof import('textmode.figlet.js').FigFontParser;
  const FigLayoutEngine: typeof import('textmode.figlet.js').FigLayoutEngine;
  const FigSmushRules: typeof import('textmode.figlet.js').FigSmushRules;
  const FIGFONT_REQUIRED_CODEPOINTS: typeof import('textmode.figlet.js').FIGFONT_REQUIRED_CODEPOINTS;
  const EASING_FUNCTIONS: typeof import('textmode.synth.js').EASING_FUNCTIONS;
  const setGlobalErrorCallback: typeof import('textmode.synth.js').setGlobalErrorCallback;

  // Cleanup
  function onDispose(fn: () => void): void;

  // Synth Source Functions (re-exported as globals)
  const osc: typeof import('textmode.synth.js').osc;
  const noise: typeof import('textmode.synth.js').noise;
  const plasma: typeof import('textmode.synth.js').plasma;
  const moire: typeof import('textmode.synth.js').moire;
  const gradient: typeof import('textmode.synth.js').gradient;
  const solid: typeof import('textmode.synth.js').solid;
  const shape: typeof import('textmode.synth.js').shape;
  const src: typeof import('textmode.synth.js').src;
  const char: typeof import('textmode.synth.js').char;
  const voronoi: typeof import('textmode.synth.js').voronoi;
  const charColor: typeof import('textmode.synth.js').charColor;
  const cellColor: typeof import('textmode.synth.js').cellColor;
  const paint: typeof import('textmode.synth.js').paint;

  // Array Extensions for synth modulation
  interface Array<T> {
    fast(speed?: number): this;
    smooth(speed?: number): this;
    ease(ease: EasingFunction): this;
    offset(offset: number): this;
    fit(low: number, high: number): this;
  }
}
`;
