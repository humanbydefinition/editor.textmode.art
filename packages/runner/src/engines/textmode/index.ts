import { TextmodeEngine } from './TextmodeEngine';
import { createRunner } from '../../shared/createRunner';

createRunner(
	(origins) => new TextmodeEngine(origins),
	'Runner is running in top-level window (debug mode).'
);
