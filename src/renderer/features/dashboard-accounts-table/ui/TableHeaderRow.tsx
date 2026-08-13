import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { type SortKey, type TableSortState } from '../lib/types';

import { GRID_TEMPLATE } from './tableLayout';

type Props = {
  sort: TableSortState;
  onSort: (key: SortKey) => void;
};

// Every SortKey (chain + all numeric buckets) is sortable — 'address' is the
// only header that isn't, so narrowing on that literal is enough.
const isSortable = (key: SortKey | 'address'): key is SortKey => key !== 'address';

const Caret = ({ dir }: { dir: TableSortState['dir'] }) => (
  <span className="text-tab-text-accent">{dir === 'asc' ? '↑' : '↓'}</span>
);

export const TableHeaderRow = ({ sort, onSort }: Props) => {
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
    <div className={cnTw(GRID_TEMPLATE, 'sticky top-0 z-10 h-8.5 bg-card-background')}>
      <div className="text-left">{renderHeader('chain', 'left')}</div>
      <div className="text-left">{renderHeader('address', 'left')}</div>
      <div className="text-right">{renderHeader('transferable', 'right')}</div>
      <div className="text-right">{renderHeader('staked', 'right')}</div>
      <div className="text-right">{renderHeader('governance', 'right')}</div>
      <div className="text-right">{renderHeader('other', 'right')}</div>
      <div className="text-right">{renderHeader('total', 'right')}</div>
    </div>
  );
};
