import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { type OperationsSort, type SortDirection, type SortKey } from '../lib/operations-sort';
import { operationsContextModel } from '../model/context';

import { operationColumns } from './table-layout';

const LABEL_CLASS = 'truncate text-caption uppercase';

type SortArrowsProps = {
  direction: SortDirection | null;
};

const SortArrows = ({ direction }: SortArrowsProps) => (
  <span
    className={cnTw(
      'flex flex-col items-center gap-[2px] opacity-50 transition-opacity group-hover:opacity-100',
      direction !== null && 'opacity-100',
    )}
  >
    <span
      className={cnTw(
        'size-0 border-x-[3.5px] border-b-4 border-x-transparent',
        direction === 'asc' ? 'border-b-icon-accent' : 'border-b-icon-default',
      )}
    />
    <span
      className={cnTw(
        'size-0 border-x-[3.5px] border-t-4 border-x-transparent',
        direction === 'desc' ? 'border-t-icon-accent' : 'border-t-icon-default',
      )}
    />
  </span>
);

type HeaderCellProps = {
  label: string;
  sortKey: SortKey;
  sort: OperationsSort;
  className?: string;
  title: string;
};

const HeaderCell = ({ label, sortKey, sort, className, title }: HeaderCellProps) => {
  const active = sort?.by === sortKey;
  const direction = active ? sort.direction : null;

  return (
    <button
      type="button"
      title={title}
      className={cnTw(className, 'group flex items-center gap-x-1 outline-none')}
      onClick={() => operationsContextModel.sortToggled(sortKey)}
    >
      <span className={cnTw(LABEL_CLASS, active ? 'text-text-primary' : 'text-text-tertiary')}>{label}</span>
      <SortArrows direction={direction} />
    </button>
  );
};

export const OperationsTableHeader = () => {
  const { t } = useI18n();
  const sort = useUnit(operationsContextModel.$sort);

  return (
    <div className="sticky top-0 z-10 flex items-center gap-x-2 border-b border-divider bg-background-default px-4 py-2">
      <div className={cnTw(operationColumns.leftBlock, 'flex items-center gap-x-2')}>
        <HeaderCell
          className={operationColumns.titleCell}
          label={t('operations.table.operation')}
          sortKey="type"
          sort={sort}
          title={t('operations.table.sortByType')}
        />
        <HeaderCell
          className={operationColumns.value}
          label={t('operations.table.value')}
          sortKey="value"
          sort={sort}
          title={t('operations.table.sortByValue')}
        />
      </div>

      <HeaderCell
        className={operationColumns.submitter}
        label={t('operations.table.submitter')}
        sortKey="submitter"
        sort={sort}
        title={t('operations.table.sortBySubmitter')}
      />

      <div className={cnTw(operationColumns.description, LABEL_CLASS, 'text-text-tertiary')}>
        {t('operations.table.description')}
      </div>

      <div className={operationColumns.draftBadge} />
      <div className={operationColumns.status} />
      <div className={operationColumns.actions} />
      <div className={operationColumns.trailingSpacer} />
      <div className={operationColumns.chevron} />
    </div>
  );
};
