import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';
import type { LegalLocale } from '@/features/legal/model/legalLocale';

interface LegalLanguageToggleProps {
	locale: LegalLocale;
	onLocaleChange: (locale: LegalLocale) => void;
	className?: string;
	ariaLabel?: string;
}

export function LegalLanguageToggle({
	locale,
	onLocaleChange,
	className,
	ariaLabel = 'Document language',
}: LegalLanguageToggleProps) {
	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn('inline-flex items-center rounded-md border border-white/10 bg-zinc-900/60 p-0.5', className)}
		>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				aria-pressed={locale === 'en'}
				onClick={() => onLocaleChange('en')}
				className={cn(
					'h-7 px-2 text-xs transition-colors',
					locale === 'en'
						? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
						: 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
				)}
			>
				<span lang="en">English</span>
			</Button>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				aria-pressed={locale === 'de'}
				onClick={() => onLocaleChange('de')}
				className={cn(
					'h-7 px-2 text-xs transition-colors',
					locale === 'de'
						? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
						: 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
				)}
			>
				<span lang="de">Deutsch</span>
			</Button>
		</div>
	);
}
