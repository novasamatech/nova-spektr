import { useI18n } from '@/shared/i18n';
import { Button, Icon } from '@/shared/ui';
import { type FilterChip, type TableFilters } from '../lib/filters';

type Props = {
  chips: FilterChip[];
  onChange: (filters: TableFilters) => void;
  onClearAll: () => void;
};

export const FilterChips = ({ chips, onChange, onClearAll }: Props) => {
  const { t } = useI18n();

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-divider bg-extended-block-background px-4 py-2.5">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="flex h-6.5 items-center gap-1 rounded-full border border-filter-border bg-block-background-default px-3 text-footnote text-text-secondary"
        >
          <span className="truncate">{chip.label}</span>
          <button
            type="button"
            className="flex size-4 shrink-0 items-center justify-center rounded-full text-text-tertiary hover:bg-block-background hover:text-text-primary"
            aria-label={t('dashboard.accountsTable.filters.removeFilter', { label: chip.label })}
            onClick={() => onChange(chip.next)}
          >
            <Icon name="close" size={10} />
          </button>
        </span>
      ))}

      <Button variant="text" size="sm" onClick={onClearAll}>
        {t('dashboard.accountsTable.clearAll')}
      </Button>
    </div>
  );
};
