import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AdminHeaderProps = {
    loading: boolean;
    onRefresh: () => void;
};

/**
 * Sticky header bar with logo and refresh button
 */
export function AdminHeader({ loading, onRefresh }: AdminHeaderProps) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:block">
                            synth.textmode.art
                        </span>
                        <h1 className="text-sm font-semibold leading-none sm:text-base">das nest</h1>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="ml-2 hidden sm:inline">Refresh</span>
                </Button>
            </div>
        </header>
    );
}
