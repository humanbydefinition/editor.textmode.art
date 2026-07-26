import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { cn } from '@/shared/lib/cn';

/**
 * shadcn/ui Sonner wrapper with project styling.
 */
export function Toaster({ className, ...props }: ToasterProps) {
	return (
		<Sonner
			className={cn('toaster group', className)}
			toastOptions={{
				classNames: {
					toast: 'group toast pointer-events-auto group-[.toaster]:border-2 group-[.toaster]:border-border group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:shadow-none',
					title: 'group-[.toast]:text-card-foreground',
					description: 'group-[.toast]:text-muted-foreground',
					success: 'group-[.toaster]:border-emerald-500 group-[.toaster]:text-emerald-300',
					error: 'group-[.toaster]:border-destructive group-[.toaster]:text-destructive',
					actionButton:
						'pointer-events-auto group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
					cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
					closeButton: 'pointer-events-auto',
				},
			}}
			{...props}
		/>
	);
}
