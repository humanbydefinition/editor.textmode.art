import * as React from 'react';
import { cn } from '@/shared/lib/cn';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return (
        <div
            data-slot="skeleton"
            className={cn('animate-pulse rounded-md bg-muted/70 motion-reduce:animate-none', className)}
            {...props}
        />
    );
}

export { Skeleton };
