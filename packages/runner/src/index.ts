import { TextmodeEngine } from './engines/textmode/TextmodeEngine';
import { createRunner } from './shared/createRunner';

createRunner(TextmodeEngine, 'Runner is running in top-level window (debug mode).');
