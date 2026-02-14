import { accessSync, constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

const requiredEntries = ['textmode.html', 'strudel.html', 'index.html'];

const missing = requiredEntries.filter((entry) => {
	const fullPath = path.join(distDir, entry);
	try {
		accessSync(fullPath, constants.R_OK);
		return false;
	} catch {
		return true;
	}
});

if (missing.length > 0) {
	console.error('[runner build contract] missing dist entries:', missing.join(', '));
	process.exit(1);
}

console.log('[runner build contract] required dist entries present:', requiredEntries.join(', '));
