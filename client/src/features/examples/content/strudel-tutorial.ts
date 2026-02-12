import type { Example } from '@/features/examples/examples.types';

export const tutorials: Example[] = [
    {
        id: 'strudel-1-basics',
        name: 'tutorial #1: basics',
        description: 'introduction to rhythm and notes',
        category: 'tutorial',
        code: `// todo

// 1. Simple drum beat
// 's' sets the sound bank. 'bd' is bass drum, 'sd' is snare.
// Using just strings creates a sequence.
$: s("bd sd bd sd")

// 2. Add some notes
// 'note' plays melodic notes.
// 'params' like .s() (synth) change the sound.
$: note("c3 e3 g3 b3")
  .s("sawtooth")
  .lpf(1000) // Low pass filter
`,
    },
];
