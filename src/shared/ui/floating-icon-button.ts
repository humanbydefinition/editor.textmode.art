import { cva } from 'class-variance-authority';

export const floatingIconButtonVariants = cva(
	[
		'flex items-center justify-center rounded-full backdrop-blur-md',
		'transition-all duration-300',
		'focus-visible:outline-none focus-visible:ring-2',
		'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100',
	],
	{
		variants: {
			tone: {
				default: [
					'bg-zinc-900/40 border border-white/5 text-zinc-400',
					'hover:scale-105 hover:bg-zinc-800/60 hover:text-white',
					'focus-visible:ring-white/10',
				],
				warning: [
					'bg-amber-500/15 border border-amber-500/30 text-amber-200',
					'hover:scale-105 hover:bg-amber-500/25',
					'focus-visible:ring-amber-400/30',
				],
			},
			size: {
				compact: 'h-6 w-6',
			},
		},
		defaultVariants: {
			tone: 'default',
			size: 'compact',
		},
	}
);
