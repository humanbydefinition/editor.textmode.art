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
        // Regex to identify tokens:
        // Group 1: Single line comments (// ...)
        // Group 2: Multi-line comments (/* ... */)
        // Group 3: Strings ("...", '...', `...`) - handles escaped quotes
        // Group 4: Numbers (integers or floats, respecting word boundaries)
        const tokenRegex = /(\/\/.*)|(\/\*[\s\S]*?\*\/)|(['"`](?:\\.|[^\\\n\r])*['"`])|((?<![\w$])-?\d+(?:\.\d+)?(?![\w$]))/g;

        const matches = [...code.matchAll(tokenRegex)];
        
        // Filter to keep only matches that are actually numbers (Group 4 is defined)
        // Groups 1, 2, and 3 are comments/strings that we want to ignore.
        const numberMatches = matches.filter(m => m[4] !== undefined);

        if (numberMatches.length === 0) {
            return code;
        }

        // Pick a random number match
        const randomIndex = Math.floor(Math.random() * numberMatches.length);
        const match = numberMatches[randomIndex];
        const originalValueStr = match[4]; // The captured number string
        const index = match.index;

        if (index === undefined) {
            return code;
        }

        const originalValue = parseFloat(originalValueStr);
        let newValue: number;

        const isFloat = originalValueStr.includes('.');

        if (isFloat) {
            // Modify float: +/- 10% or at least 0.1
            const delta = Math.max(Math.abs(originalValue) * 0.1, 0.1);
            const variation = (Math.random() * 2 - 1) * delta; 
            newValue = originalValue + variation;
            
            // Limit precision to avoid messy long floats
            newValue = parseFloat(newValue.toFixed(4));
        } else {
            // Modify integer: +/- 1..10
            const variation = Math.floor(Math.random() * 10) + 1;
            const sign = Math.random() < 0.5 ? -1 : 1;
            newValue = originalValue + (variation * sign);
            
            newValue = Math.round(newValue);
        }

        // Fallback safety to ensure change (mostly for floats where rounding might revert to original)
        if (newValue === originalValue) {
             newValue = isFloat ? originalValue + 0.1 : originalValue + 1;
             if (isFloat) newValue = parseFloat(newValue.toFixed(4));
        }

        // Reconstruct code
        // We use match.index which points to the start of the *match*.
        // Since we filtered for Group 4, the match IS the number.
        const before = code.substring(0, index);
        const after = code.substring(index + originalValueStr.length);

        return before + newValue.toString() + after;
    }
}