import type { FilterOption, StatusCounts } from '../types';

type FilterTabsProps = {
    value: FilterOption;
    counts: StatusCounts;
    onChange: (filter: FilterOption) => void;
};

const filterOptions: { key: FilterOption; label: string; countKey?: keyof StatusCounts }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', countKey: 'PENDING' },
    { key: 'approved', label: 'Approved', countKey: 'APPROVED' },
    { key: 'denied', label: 'Denied', countKey: 'DENIED' },
];

/**
 * Horizontal filter tabs for request status
 */
export function FilterTabs({ value, counts, onChange }: FilterTabsProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {filterOptions.map((opt) => {
                const isActive = value === opt.key;
                const count = opt.countKey ? counts[opt.countKey] : undefined;

                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => onChange(opt.key)}
                        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        {opt.label}
                        {count !== undefined && (
                            <span className={`text-xs ${isActive ? 'opacity-80' : 'opacity-50'}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
