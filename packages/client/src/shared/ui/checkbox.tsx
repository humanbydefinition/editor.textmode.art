import * as React from 'react';
import { cn } from '@/shared/lib/cn';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => {
    return (
        <input
            ref={ref}
            type="checkbox"
            className={cn(
                'peer h-4 w-4 shrink-0 rounded border border-zinc-500 bg-zinc-900',
                'accent-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
        />
    );
});

Checkbox.displayName = 'Checkbox';

export { Checkbox };
