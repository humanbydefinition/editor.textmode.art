// Source - https://stackoverflow.com/a/78307805
// Posted by ybmeng
// Retrieved 2026-02-05, License - CC BY-SA 4.0

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
