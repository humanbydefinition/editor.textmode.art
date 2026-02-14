import { StrudelRunner } from './StrudelRunner';
import { createRunner } from '../shared/createRunner';

createRunner(new StrudelRunner(), 'Strudel runner is running in top-level window (debug mode).');
