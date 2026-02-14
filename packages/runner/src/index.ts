import { TextmodeRunner } from './TextmodeRunner';
import { createRunner } from './shared/createRunner';

createRunner(new TextmodeRunner(), 'Runner is running in top-level window (debug mode).');
