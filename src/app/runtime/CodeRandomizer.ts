const BLEND_MODES = [
    'normal',
    'additive',
    'multiply',
    'screen',
    'subtract',
    'darken',
    'lighten',
    'overlay',
    'softLight',
    'hardLight',
    'colorDodge',
    'colorBurn',
    'difference',
    'exclusion',
] as const;

/**
 * Service to handle random code modifications.
 * Mimics the "make random change" feature from Hydra.
 */
export class CodeRandomizer {
    /**
     * Makes a single random change to the code — either mutating a number
     * or swapping a blend mode (if any are present).
     */
    static makeRandomChange(code: string): string {
        const numberTargets = this.findNumberTargets(code);
        const blendTargets = this.findBlendModeTargets(code);

        const totalTargets = numberTargets.length + blendTargets.length;
        if (totalTargets === 0) return code;

        // Pick one target at random from the combined pool
        const pick = Math.floor(Math.random() * totalTargets);

        if (pick < numberTargets.length) {
            return this.applyNumberChange(code, numberTargets[pick]);
        }
        return this.applyBlendModeChange(code, blendTargets[pick - numberTargets.length]);
    }

    // ---- Number mutation ----

    private static findNumberTargets(code: string): Array<{ index: number; text: string }> {
        // Group 1: Single line comments (// ...)
        // Group 2: Multi-line comments (/* ... */)
        // Group 3: Strings ("...", '...', `...`) — handles escaped quotes
        // Group 4: Numbers (integers or floats, respecting word boundaries)
        const tokenRegex = /(\/\/.*)|(\/\*[\s\S]*?\*\/)|(['"`](?:\\.|[^\\\n\r])*['"`])|((?<![\w$])-?\d+(?:\.\d+)?(?![\w$]))/g;
        const matches = [...code.matchAll(tokenRegex)];
        const results: Array<{ index: number; text: string }> = [];
        for (const m of matches) {
            if (m[4] !== undefined && m.index !== undefined) {
                results.push({ index: m.index, text: m[4] });
            }
        }
        return results;
    }

    private static applyNumberChange(code: string, target: { index: number; text: string }): string {
        const originalValue = parseFloat(target.text);
        const isFloat = target.text.includes('.');
        let newValue: number;

        if (isFloat) {
            const delta = Math.max(Math.abs(originalValue) * 0.1, 0.1);
            const variation = (Math.random() * 2 - 1) * delta;
            newValue = parseFloat((originalValue + variation).toFixed(4));
        } else {
            const variation = Math.floor(Math.random() * 10) + 1;
            const sign = Math.random() < 0.5 ? -1 : 1;
            newValue = Math.round(originalValue + variation * sign);
        }

        if (newValue === originalValue) {
            newValue = isFloat ? parseFloat((originalValue + 0.1).toFixed(4)) : originalValue + 1;
        }

        return code.substring(0, target.index) + newValue.toString() + code.substring(target.index + target.text.length);
    }

    // ---- Blend mode mutation ----

    private static findBlendModeTargets(code: string): Array<{ index: number; text: string; quote: string }> {
        // Match blend mode values in two contexts (outside comments):
        //   1. blendMode property:  blendMode: 'screen'  or  blendMode: "screen"
        //   2. blendMode method:    .blendMode('screen')  or  .blendMode("screen")
        const blendRegex = /(?:blendMode\s*:\s*|\.blendMode\s*\(\s*)(['"])(\w+)\1/g;

        // Also build a set of valid modes for fast lookup.
        const validModes: Set<string> = new Set(BLEND_MODES);

        // We need to skip matches inside comments.
        // Build a simple set of comment ranges first.
        const commentRanges = this.getCommentRanges(code);

        const results: Array<{ index: number; text: string; quote: string }> = [];
        for (const m of code.matchAll(blendRegex)) {
            if (m.index === undefined) continue;
            const quote = m[1];
            const mode = m[2];
            if (!validModes.has(mode)) continue;

            // The captured mode string (group 2) starts after the quote character (group 1).
            // We need the index of the full quoted value (quote + mode + quote) so we can
            // replace only the mode text inside the quotes.
            const modeStart = m.index + m[0].indexOf(quote) + 1;
            if (this.isInsideComment(modeStart, commentRanges)) continue;

            results.push({ index: modeStart, text: mode, quote });
        }
        return results;
    }

    private static applyBlendModeChange(code: string, target: { index: number; text: string }): string {
        // Pick a different blend mode
        const candidates = BLEND_MODES.filter(m => m !== target.text);
        const newMode = candidates[Math.floor(Math.random() * candidates.length)];
        return code.substring(0, target.index) + newMode + code.substring(target.index + target.text.length);
    }

    // ---- Helpers ----

    private static getCommentRanges(code: string): Array<[number, number]> {
        const ranges: Array<[number, number]> = [];
        const commentRegex = /\/\/.*|\/\*[\s\S]*?\*\//g;
        for (const m of code.matchAll(commentRegex)) {
            if (m.index !== undefined) {
                ranges.push([m.index, m.index + m[0].length]);
            }
        }
        return ranges;
    }

    private static isInsideComment(index: number, ranges: Array<[number, number]>): boolean {
        return ranges.some(([start, end]) => index >= start && index < end);
    }
}