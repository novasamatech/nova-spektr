import { type ReactNode } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { type SortKey, type TableSortState } from '../lib/types';

import { GRID_TEMPLATE, TOTAL_CELL_CLASS, WIDE_ONLY_CLASS } from './tableLayout';

type Props = {
  sort: TableSortState;
  onSort: (key: SortKey) => void;
  /**
   * Fold-all control, rendered inside the Chain cell — it folds the very groups
   * that column names, which is what lets it stand there without a label.
   */
  foldAll?: ReactNode;
};

// Every SortKey (chain + all numeric buckets) is sortable — 'address' is the
// only header that isn't, so narrowing on that literal is enough.
const isSortable = (key: SortKey | 'address'): key is SortKey => key !== 'address';

const Caret = ({ dir }: { dir: TableSortState['dir'] }) => (
  <span className="text-tab-text-accent">{dir === 'asc' ? '↑' : '↓'}</span>
);

export const TableHeaderRow = ({ sort, onSort, foldAll }: Props) => {
  const { t } = useI18n();

  const renderHeader = (key: SortKey | 'address', align: 'left' | 'right') => {
    const label = t(`dashboard.accountsTable.columns.${key}`);
    const sortable = isSortable(key);
    const active = sortable && sort.key === key;

    const content = (
      <FootnoteText
        as="span"
        className={cnTw('flex items-center gap-1', key === 'total' ? 'text-text-secondary' : 'text-text-tertiary', {
          'justify-end': align === 'right',
        })}
      >
        {label}
        {active ? <Caret dir={sort.dir} /> : null}
      </FootnoteText>
    );

    if (!sortable) {
      return content;
    }

    return (
      <button
        type="button"
        className={cnTw('flex items-center', align === 'right' ? 'ms-auto justify-end' : 'justify-start')}
        onClick={() => onSort(key)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className={cnTw(GRID_TEMPLATE, 'sticky top-0 z-10 h-9 bg-card-background')}>
      <div className="flex items-center gap-x-1 text-left">
        {foldAll}
        {renderHeader('chain', 'left')}
      </div>
      <div className={cnTw('text-left', WIDE_ONLY_CLASS)}>{renderHeader('address', 'left')}</div>
      <div className="text-right">{renderHeader('transferable', 'right')}</div>
      <div className="text-right">{renderHeader('staked', 'right')}</div>
      <div className="text-right">{renderHeader('governance', 'right')}</div>
      <div className="text-right">{renderHeader('other', 'right')}</div>
      <div className={cnTw(TOTAL_CELL_CLASS, 'justify-center')}>{renderHeader('total', 'right')}</div>
    </div>
  );
};
