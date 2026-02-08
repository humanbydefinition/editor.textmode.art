
/**
 * Service to handle random code modifications.
 * Mimics the "make random change" feature from Hydra.
 */
export class CodeRandomizer {
    /**
     * Replaces a random number in the code with a varied value.
     * @param code The source code to modify.
     * @returns The modified code, or the original if no numbers found.
     */
    static replaceRandomNumber(code: string): string {
        // Regex to find numbers:
        // - Optional negative sign
        // - Integer part
        // - Optional decimal part
        // We use capturing group for the number to easily extract it.
        // We exclude hex/binary for simplicity for now, focusing on base-10 logic.
        // We also try to avoid replacing numbers inside words (word boundaries).
        const numberRegex = /(?<![\w$])(-?\d+(?:\.\d+)?)(?![\w$])/g;

        const matches = [...code.matchAll(numberRegex)];

        if (matches.length === 0) {
            return code;
        }

        // Pick a random match
        const randomIndex = Math.floor(Math.random() * matches.length);
        const match = matches[randomIndex];
        const originalValueStr = match[0];
        const index = match.index;

        if (index === undefined) {
            return code;
        }

        const originalValue = parseFloat(originalValueStr);
        let newValue: number;

        // Check if integer (no dot in string representation, usually)
        const isFloat = originalValueStr.includes('.');

        if (isFloat) {
            // Modify float
            // Strategy: +/- 10% of value, or at least 0.1
            const delta = Math.max(Math.abs(originalValue) * 0.1, 0.1);
            const variation = (Math.random() * 2 - 1) * delta; // -delta to +delta
            newValue = originalValue + variation;
            
            // Keep precision roughly similar (e.g. 2 decimal places)
            // But we don't want to be too strict. Let's limit to 4 decimal places for sanity.
            newValue = parseFloat(newValue.toFixed(4));
        } else {
            // Modify integer
            // Strategy: +/- rand(1..10)
            const variation = Math.floor(Math.random() * 10) + 1;
            const sign = Math.random() < 0.5 ? -1 : 1;
            newValue = originalValue + (variation * sign);
            
            // Ensure we don't accidentally turn it into a float if logic messed up (it shouldn't)
            newValue = Math.round(newValue);
        }

        // Reconstruct code
        const before = code.substring(0, index);
        const after = code.substring(index + originalValueStr.length);

        return before + newValue.toString() + after;
    }
}
