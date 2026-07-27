import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, CaptionText, CountChip, Icon, SmallTitleText } from '@/shared/ui';
import { type TableSort, Tooltip } from '@/shared/ui-kit';
import { ValidatorSelectionModal } from '@/features/validator-selection';
import { DashboardWidget } from '@/pages/Dashboard';
import { usePositionRows } from '../hooks/usePositionRows';
import { type PositionRow, DEFAULT_SORT, isSortColumn, sortPositionRows } from '../lib';
import { positionActions } from '../model/position-actions';

import { PositionDetailDrawer } from './PositionDetailDrawer';
import { PositionsEmptyState } from './PositionsEmptyState';
import { PositionsTable, SCROLL_THRESHOLD } from './PositionsTable';
import { PositionsTableSkeleton } from './PositionsTableSkeleton';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

/**
 * The staking tab's main surface: one row per (account × chain) position.
 *
 * Sorting is controlled rather than left to the table, because "largest stake
 * first" has to hold over planck strings no `Number` can compare — see
 * `lib/position-metrics`.
 */
export const PositionsWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  const { rows, pending } = usePositionRows(accountIds);
  const actionsWired = useUnit(positionActions.$actionsWired);
  const changeValidatorsTarget = useUnit(positionActions.$changeValidatorsTarget);

  const [sort, setSort] = useState<TableSort>(DEFAULT_SORT);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    if (!isSortColumn(sort.column)) return rows;

    return sortPositionRows(rows, sort.column, sort.direction);
  }, [rows, sort]);

  // A row is looked up rather than stored: the position keeps updating while the
  // drawer is open, and a snapshot taken at click time would go stale on screen.
  const openRow = useMemo<PositionRow | null>(
    () => sortedRows.find((row) => row.id === openRowId) ?? null,
    [sortedRows, openRowId],
  );

  const handleSortChange = useCallback((next: TableSort | null) => {
    // Clearing the sort would leave the rows in aggregate order, which means
    // nothing to the user. The default is the answer to "which is biggest".
    setSort(next ?? DEFAULT_SORT);
  }, []);

  const handleRowClick = useCallback((row: PositionRow) => setOpenRowId(row.id), []);
  const closeDrawer = useCallback(() => setOpenRowId(null), []);
  const closePicker = useCallback(() => positionActions.events.changeValidatorsClosed(), []);
  const startStaking = useCallback(() => positionActions.events.startStakingRequested(), []);

  return (
    <DashboardWidget colSpan={4}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <SmallTitleText>{t('dashboard.staking.positions.title')}</SmallTitleText>
          {rows.length > 0 ? <CountChip count={rows.length} /> : null}
        </div>

        <Tooltip open={actionsWired ? false : undefined}>
          <Tooltip.Trigger>
            <div>
              <Button
                variant="text"
                size="sm"
                disabled={!actionsWired}
                prefixElement={<Icon name="add" size={14} className="text-inherit" />}
                onClick={startStaking}
              >
                {t('dashboard.staking.positions.newPosition')}
              </Button>
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>{t('dashboard.staking.positions.detail.actions.notWired')}</Tooltip.Content>
        </Tooltip>
      </div>

      {pending && rows.length === 0 ? <PositionsTableSkeleton /> : null}

      {!pending && rows.length === 0 ? (
        <PositionsEmptyState actionsWired={actionsWired} onStartStaking={startStaking} />
      ) : null}

      {rows.length > 0 ? (
        <>
          <PositionsTable rows={sortedRows} sort={sort} onSortChange={handleSortChange} onRowClick={handleRowClick} />

          {rows.length > SCROLL_THRESHOLD ? (
            <CaptionText className="px-3 pt-2 text-text-tertiary">
              {t('dashboard.staking.positions.scrollHint', { count: rows.length })}
            </CaptionText>
          ) : null}
        </>
      ) : null}

      <PositionDetailDrawer row={openRow} onClose={closeDrawer} />

      <ValidatorSelectionModal isOpen={changeValidatorsTarget !== null} onClose={closePicker} />
    </DashboardWidget>
  );
};
