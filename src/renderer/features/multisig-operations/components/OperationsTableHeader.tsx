import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { IconButton } from '@/shared/ui';
import {
  type ResizableColumn,
  type ToggleableColumn,
  HEADER_SEPARATOR_CLASS,
  TOGGLEABLE_COLUMNS,
  getColumnStyle,
  getLeftBlockWidth,
  operationColumns,
} from '@/shared/ui/operations-table-layout';
import { Dropdown } from '@/shared/ui-kit';
import { connectionHistoryModel } from '@/aggregates/backend';
import {
  operationsTableLayoutModel,
  useOperationColumnVisibility,
  useOperationColumnWidths,
} from '@/aggregates/operations-table-layout';
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

/** Menu captions reuse the column captions; Status is labelled "Signed" there. */
const COLUMN_LABEL_KEYS: Record<ToggleableColumn, string> = {
  value: 'operations.table.value',
  submitter: 'operations.table.submitter',
  initiator: 'operations.table.initiator',
  description: 'operations.table.description',
  status: 'operations.table.signed',
  actions: 'operations.table.actions',
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
  const visibility = useOperationColumnVisibility();

  // Pending rows carry "X of Y signed"; everywhere else the pill is a resolved status.
  const statusLabel = tab === 'pending' && !isScopeMerged ? t('operations.table.signed') : t('operations.table.status');
  // History rows have no row actions, so the caption would float over nothing.
  const showActionsLabel = tab !== 'history';

  return (
    <div className="sticky top-0 z-10 flex items-center gap-x-2 border-b border-divider bg-background-default px-4 py-2">
      <div
        className={cnTw(operationColumns.leftBlock, 'flex items-center gap-x-2')}
        style={getColumnStyle(getLeftBlockWidth(widths, visibility))}
      >
        <HeaderCell
          className={cnTw(operationColumns.titleCell, 'flex')}
          label={t('operations.table.operation')}
          sortable={{ sortKey: 'type', sort, title: t('operations.table.sortByType') }}
          resize={{ column: 'operation', width: widths.operation, handleClass: '-right-3' }}
        />
        {visibility.value && (
          <HeaderCell
            className={cnTw(operationColumns.value, HEADER_SEPARATOR_CLASS, 'flex')}
            label={t('operations.table.value')}
            sortable={{ sortKey: 'value', sort, title: t('operations.table.sortByValue') }}
            resize={{ column: 'value', width: widths.value, handleClass: '-right-3' }}
          />
        )}
      </div>

      {visibility.submitter && (
        <HeaderCell
          className={cnTw(operationColumns.submitter, HEADER_SEPARATOR_CLASS, 'flex')}
          label={t('operations.table.submitter')}
          sortable={{ sortKey: 'submitter', sort, title: t('operations.table.sortBySubmitter') }}
          resize={{ column: 'submitter', width: widths.submitter, handleClass: '-right-3' }}
        />
      )}

      {/* Not sortable, but resizable like its neighbours. */}
      {visibility.initiator && (
        <HeaderCell
          className={cnTw(operationColumns.initiator, HEADER_SEPARATOR_CLASS, 'flex')}
          label={t('operations.table.initiator')}
          resize={{ column: 'initiator', width: widths.initiator, handleClass: '-right-3' }}
        />
      )}

      {/* Descriptions come from the external address book — hide the label (keeping the column spacer)
          until it has been connected, mirroring the drafts section gate. A hidden Description keeps
          the same flexible spacer so the fixed columns don't slide left. */}
      {visibility.description ? (
        <div className={cnTw(operationColumns.description, HEADER_SEPARATOR_CLASS, LABEL_CLASS, 'text-text-tertiary')}>
          {hasEverConnected && t('operations.table.description')}
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      {visibility.status && (
        <HeaderCell
          className={cnTw(operationColumns.status, HEADER_SEPARATOR_CLASS, 'flex justify-center')}
          label={statusLabel}
          resize={{ column: 'status', width: widths.status, handleClass: '-right-3' }}
        />
      )}
      {visibility.actions && (
        <HeaderCell
          className={cnTw(operationColumns.actions, HEADER_SEPARATOR_CLASS, 'flex justify-center')}
          label={showActionsLabel ? t('operations.table.actions') : ''}
          resize={{ column: 'actions', width: widths.actions, handleClass: '-right-3' }}
        />
      )}

      {/* Occupies the rows' chevron slot; `-m-1.5` cancels the IconButton padding so the
          28px control still lays out as the 16px column. */}
      <div
        className={cnTw(operationColumns.chevron, 'flex items-center justify-center')}
        onClick={event => event.stopPropagation()}
      >
        <Dropdown align="end">
          <Dropdown.Trigger>
            <IconButton name="settingsLite" size={16} className="-m-1.5" ariaLabel={t('operations.table.settings')} />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Group label={t('operations.table.columns')}>
              {TOGGLEABLE_COLUMNS.map(column => (
                <Dropdown.CheckboxItem
                  key={column}
                  checked={visibility[column]}
                  onChange={visible => operationsTableLayoutModel.columnVisibilityChanged({ column, visible })}
                >
                  {t(COLUMN_LABEL_KEYS[column])}
                </Dropdown.CheckboxItem>
              ))}
            </Dropdown.Group>
            <Dropdown.Separator />
            <Dropdown.Item onSelect={() => operationsTableLayoutModel.layoutReset()}>
              {t('operations.table.resetDefaults')}
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
      </div>
    </div>
  );
};
