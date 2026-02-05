/**
 * Entry point for the Textmode runner iframe.
 */
import { TextmodeRunner } from './TextmodeRunner';

const runner = new TextmodeRunner();

// Start when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => runner.start());
} else {
	runner.start();
}
