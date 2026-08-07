import { type MouseEvent, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { Checkbox } from '../Checkbox/Checkbox';
import { Input } from '../Input/Input';
import { Popover } from '../Popover/Popover';

import { enumOptions } from './filtering';
import { type DataTableColumn, type DataTableFilterState } from './types';

type Props<T> = {
  column: DataTableColumn<T>;
  rows: T[];
  filters: DataTableFilterState;
  active: boolean;
  onFiltersChange: (next: DataTableFilterState) => void;
};

const parseBound = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * The funnel on a column header.
 *
 * The trigger stops propagation: the whole header cell is the sort target, so a
 * click meant for the filter would otherwise re-sort the table underneath the
 * popover the user just opened.
 */
export const DataTableFilterPopover = <T,>({ column, rows, filters, active, onFiltersChange }: Props<T>) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const stop = (event: MouseEvent) => event.stopPropagation();

  const setText = (value: string) => {
    onFiltersChange({ ...filters, text: { ...filters.text, [column.id]: value } });
  };

  const toggleOption = (option: string) => {
    const selected = filters.enum[column.id] ?? [];
    const next = selected.includes(option) ? selected.filter(o => o !== option) : [...selected, option];

    onFiltersChange({ ...filters, enum: { ...filters.enum, [column.id]: next } });
  };

  const setBound = (bound: 'min' | 'max', raw: string) => {
    const current = filters.range[column.id] ?? { min: null, max: null };

    onFiltersChange({
      ...filters,
      range: { ...filters.range, [column.id]: { ...current, [bound]: parseBound(raw) } },
    });
  };

  const clearColumn = () => {
    onFiltersChange({
      text: { ...filters.text, [column.id]: '' },
      enum: { ...filters.enum, [column.id]: [] },
      range: { ...filters.range, [column.id]: { min: null, max: null } },
    });
  };

  const range = filters.range[column.id] ?? { min: null, max: null };
  const selected = filters.enum[column.id] ?? [];

  return (
    <Popover open={open} align="end" side="bottom" onToggle={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={t('dataTable.filterColumn')}
          className={cnTw(
            'flex h-4 w-4 items-center justify-center rounded text-xs transition-colors',
            active ? 'text-icon-accent' : 'text-text-tertiary opacity-40 hover:opacity-100',
          )}
          onClick={stop}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span>▾</span>
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <div className="flex w-[220px] flex-col gap-y-2 p-3" onClick={stop}>
          {column.filter === 'text' && (
            <Input
              value={filters.text[column.id] ?? ''}
              placeholder={t('dataTable.containsPlaceholder')}
              width="full"
              onChange={setText}
            />
          )}

          {column.filter === 'enum' && (
            <div className="flex max-h-56 flex-col gap-y-1.5 overflow-y-auto">
              {enumOptions(rows, column).map(option => (
                <Checkbox key={option} checked={selected.includes(option)} onChange={() => toggleOption(option)}>
                  {option}
                </Checkbox>
              ))}
            </div>
          )}

          {column.filter === 'range' && (
            <div className="flex items-center gap-x-2">
              <Input
                value={range.min === null ? '' : String(range.min)}
                placeholder={t('dataTable.min')}
                width="full"
                onChange={value => setBound('min', value)}
              />
              <Input
                value={range.max === null ? '' : String(range.max)}
                placeholder={t('dataTable.max')}
                width="full"
                onChange={value => setBound('max', value)}
              />
            </div>
          )}

          {active && (
            <button
              type="button"
              className="self-start rounded px-1 py-0.5 transition-colors hover:bg-action-background-hover"
              onClick={clearColumn}
            >
              <FootnoteText className="text-text-tertiary">{t('dataTable.clearColumn')}</FootnoteText>
            </button>
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
};
