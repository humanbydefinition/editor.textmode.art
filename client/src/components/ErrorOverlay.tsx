import { X, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/utils';
import type { CodeError } from '@/types/app.types';

interface ErrorOverlayProps {
    error: CodeError | null;
    hasLastWorking: boolean;
    onDismiss: () => void;
    onRevert: () => void;
    className?: string;
}

export function ErrorOverlay({
    error,
    hasLastWorking,
    onDismiss,
    onRevert,
    className,
}: ErrorOverlayProps) {
    if (!error) return null;

    let errorText = error.message;
    if (error.line !== undefined) {
        errorText = `line ${error.line}${error.column !== undefined ? `:${error.column}` : ''}: ${errorText}`;
    }

    return (
        <div
            className={cn(
                'fixed bottom-2 left-2 z-50 pointer-events-auto',
                'max-w-lg p-4',
                'bg-red-950/90 backdrop-blur-xl',
                'border border-red-500/30 rounded-xl',
                'shadow-2xl shadow-red-500/10',
                'animate-in slide-in-from-bottom-2 fade-in duration-200',
                className
            )}
        >
            <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-red-400">error</h3>
                <button
                    onClick={onDismiss}
                    className="text-red-400/60 hover:text-red-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <pre className="text-xs text-red-200/80 font-mono whitespace-pre-wrap break-words max-h-32 overflow-y-auto mb-3">
                {errorText}
            </pre>

            {error.stack && (
                <details className="mb-3">
                    <summary className="text-xs text-red-400/60 cursor-pointer hover:text-red-400">
                        stack trace
                    </summary>
                    <pre className="mt-2 text-[10px] text-red-300/50 font-mono whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                </details>
            )}

            <div className="flex gap-2">
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    onClick={onDismiss}
                >
                    dismiss
                </Button>
                {hasLastWorking && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20 hover:text-emerald-200"
                        onClick={onRevert}
                    >
                        <Undo2 className="w-3.5 h-3.5 mr-1.5" />
                        revert
                    </Button>
                )}
            </div>
        </div>
    );
}
