import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import {
  type ResizableColumn,
  HEADER_SEPARATOR_CLASS,
  getColumnStyle,
  getLeftBlockWidth,
  operationColumns,
} from '@/shared/ui/operations-table-layout';
import { connectionHistoryModel } from '@/aggregates/backend';
import { useOperationColumnWidths } from '@/aggregates/operations-table-layout';
import { type OperationsSort, type SortDirection, type SortKey } from '../lib/operations-sort';
import { operationsContextModel } from '../model/context';

import { ColumnResizeHandle } from './ColumnResizeHandle';

const LABEL_CLASS = 'truncate text-caption uppercase';

type SortArrowsProps = {
  direction: SortDirection | null;
};

const SortArrows = ({ direction }: SortArrowsProps) => (
  <span
    className={cnTw(
      'flex flex-col items-center gap-[2px] opacity-50 transition-opacity group-hover/sort:opacity-100',
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

type ResizeProps = { column: ResizableColumn; width: number; handleClass: string };

type HeaderCellProps = {
  label: string;
  className?: string;
  /**
   * Sortable columns (Operation / Value / Submitter) render the label as a sort
   * button.
   */
  sortable?: { sortKey: SortKey; sort: OperationsSort; title: string };
  /** Resizable columns render the drag handle on the cell's right edge. */
  resize?: ResizeProps;
};

const HeaderCell = ({ label, className, sortable, resize }: HeaderCellProps) => {
  const active = sortable !== undefined && sortable.sort?.by === sortable.sortKey;
  const direction = active && sortable.sort ? sortable.sort.direction : null;
  const labelClass = cnTw(LABEL_CLASS, active ? 'text-text-primary' : 'text-text-tertiary');

  return (
    <div className={cnTw('relative items-center', className)} style={resize && getColumnStyle(resize.width)}>
      {sortable ? (
        <button
          type="button"
          title={sortable.title}
          className={cnTw(
            'group/sort flex min-w-0 items-center gap-x-1 rounded-sm',
            'focus-visible:outline-2 focus-visible:outline-icon-accent',
          )}
          onClick={() => operationsContextModel.sortToggled(sortable.sortKey)}
        >
          <span className={labelClass}>{label}</span>
          <SortArrows direction={direction} />
        </button>
      ) : (
        <span className={labelClass}>{label}</span>
      )}
      {resize && <ColumnResizeHandle column={resize.column} width={resize.width} className={resize.handleClass} />}
    </div>
  );
};

export const OperationsTableHeader = () => {
  const { t } = useI18n();
  const sort = useUnit(operationsContextModel.$sort);
  const tab = useUnit(operationsContextModel.$tab);
  const isScopeMerged = useUnit(operationsContextModel.$isScopeMerged);
  const hasEverConnected = useUnit(connectionHistoryModel.$hasEverConnected);
  const widths = useOperationColumnWidths();

  // Pending rows carry "X of Y signed"; everywhere else the pill is a resolved status.
  const statusLabel = tab === 'pending' && !isScopeMerged ? t('operations.table.signed') : t('operations.table.status');
  // History rows have no row actions, so the caption would float over nothing.
  const showActionsLabel = tab !== 'history';

  return (
    <div className="sticky top-0 z-10 flex items-center gap-x-2 border-b border-divider bg-background-default px-4 py-2">
      <div
        className={cnTw(operationColumns.leftBlock, 'flex items-center gap-x-2')}
        style={getColumnStyle(getLeftBlockWidth(widths))}
      >
        <HeaderCell
          className={cnTw(operationColumns.titleCell, 'flex')}
          label={t('operations.table.operation')}
          sortable={{ sortKey: 'type', sort, title: t('operations.table.sortByType') }}
          resize={{ column: 'operation', width: widths.operation, handleClass: '-right-[9px]' }}
        />
        <HeaderCell
          className={cnTw(operationColumns.value, HEADER_SEPARATOR_CLASS, 'flex')}
          label={t('operations.table.value')}
          sortable={{ sortKey: 'value', sort, title: t('operations.table.sortByValue') }}
          resize={{ column: 'value', width: widths.value, handleClass: '-right-[9px]' }}
        />
      </div>

      <HeaderCell
        className={cnTw(operationColumns.submitter, HEADER_SEPARATOR_CLASS, 'flex')}
        label={t('operations.table.submitter')}
        sortable={{ sortKey: 'submitter', sort, title: t('operations.table.sortBySubmitter') }}
        resize={{ column: 'submitter', width: widths.submitter, handleClass: '-right-[9px]' }}
      />

      {/* Not sortable, but resizable like its neighbours; hidden below 2xl via `operationColumns.initiator`. */}
      <HeaderCell
        className={cnTw(operationColumns.initiator, HEADER_SEPARATOR_CLASS)}
        label={t('operations.table.initiator')}
        resize={{ column: 'initiator', width: widths.initiator, handleClass: '-right-[9px]' }}
      />

      {/* Descriptions come from the external address book — hide the label (keeping the column spacer)
          until it has been connected, mirroring the drafts section gate. */}
      <div className={cnTw(operationColumns.description, HEADER_SEPARATOR_CLASS, LABEL_CLASS, 'text-text-tertiary')}>
        {hasEverConnected && t('operations.table.description')}
      </div>

      <HeaderCell
        className={cnTw(operationColumns.status, HEADER_SEPARATOR_CLASS, 'flex justify-center')}
        label={statusLabel}
        resize={{ column: 'status', width: widths.status, handleClass: '-right-[9px]' }}
      />
      <HeaderCell
        className={cnTw(operationColumns.actions, HEADER_SEPARATOR_CLASS, 'flex justify-end')}
        label={showActionsLabel ? t('operations.table.actions') : ''}
        resize={{ column: 'actions', width: widths.actions, handleClass: '-right-[9px]' }}
      />
      <div className={operationColumns.chevron} />
    </div>
  );
};
