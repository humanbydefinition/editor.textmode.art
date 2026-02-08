import { Ban, CheckCheck, Clock4, ListFilter } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import type { FilterOption, StatusCounts } from '../types';

type FilterTabsProps = {
    value: FilterOption;
    counts: StatusCounts;
    onChange: (filter: FilterOption) => void;
};

const filterOptions: {
    key: FilterOption;
    label: string;
    countKey: keyof StatusCounts;
    icon: typeof ListFilter;
}[] = [
    { key: 'all', label: 'All', countKey: 'all', icon: ListFilter },
    { key: 'pending', label: 'Pending', countKey: 'PENDING', icon: Clock4 },
    { key: 'approved', label: 'Approved', countKey: 'APPROVED', icon: CheckCheck },
    { key: 'denied', label: 'Denied', countKey: 'DENIED', icon: Ban },
];

/**
 * Horizontal filter tabs for request status
 */
export function FilterTabs({ value, counts, onChange }: FilterTabsProps) {
    return (
        <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Filter Queue</p>
            <Tabs value={value} onValueChange={(next) => onChange(next as FilterOption)} className="w-full">
                <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-2 border-border bg-background p-1 scrollbar-hide">
                    {filterOptions.map((opt) => {
                        const Icon = opt.icon;
                        const count = counts[opt.countKey];

                        return (
                            <TabsTrigger
                                key={opt.key}
                                value={opt.key}
                                className="group h-9 gap-2 rounded-none border-2 border-transparent px-3 data-[state=active]:border-border data-[state=active]:bg-card"
                            >
                                <Icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-foreground" />
                                <span>{opt.label}</span>
                                <Badge
                                    variant="outline"
                                    className="rounded-none border-2 border-border bg-background text-[10px] tabular-nums text-muted-foreground"
                                >
                                    {count}
                                </Badge>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </Tabs>
        </div>
    );
}
