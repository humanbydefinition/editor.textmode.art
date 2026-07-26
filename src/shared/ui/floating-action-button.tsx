import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { floatingIconButtonVariants } from './floating-icon-button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	tooltip: string;
	tone?: 'default' | 'warning';
}

export const FloatingActionButton = forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
	({ children, className, tone, tooltip, type = 'button', ...buttonProps }, ref) => (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					ref={ref}
					type={type}
					className={cn(floatingIconButtonVariants({ tone }), className)}
					{...buttonProps}
				>
					{children}
				</button>
			</TooltipTrigger>
			<TooltipContent>
				<p>{tooltip}</p>
			</TooltipContent>
		</Tooltip>
	)
);

FloatingActionButton.displayName = 'FloatingActionButton';
