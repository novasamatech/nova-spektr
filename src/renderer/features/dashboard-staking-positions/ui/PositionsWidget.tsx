import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button, CountChip, Icon, SmallTitleText } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { ValidatorSelectionModal } from '@/features/validator-selection';
import { DashboardWidget } from '@/pages/Dashboard';
import { usePositionRows } from '../hooks/usePositionRows';
import { useTrackedAddressBookAccounts } from '../hooks/useTrackedAddressBookAccounts';
import { type PositionRow } from '../lib';
import { positionActions } from '../model/position-actions';

import { PositionDetailDrawer } from './PositionDetailDrawer';
import { PositionsEmptyState } from './PositionsEmptyState';
import { PositionsTable } from './PositionsTable';
import { PositionsTableSkeleton } from './PositionsTableSkeleton';

type Props = {
  accountIds: string[];
  allEntries: { accountId: string; name: string; address: string }[];
};

/**
 * The staking tab's main surface: one row per (account × chain) position.
 *
 * Sorting and filtering live in the table itself: `DataTable` reads the
 * comparators declared on each column, so "largest stake first" holds over
 * planck strings no `Number` can compare — see `lib/position-metrics`.
 *
 * This is also where the dashboard's address-book selection is handed to
 * `aggregates/staking-positions`, once for the whole staking tab.
 */
export const PositionsWidget = ({ accountIds }: Props) => {
  const { t } = useI18n();
  useTrackedAddressBookAccounts(accountIds);
  const { rows, pending } = usePositionRows(accountIds);
  const wiredActions = useUnit(positionActions.$wiredActions);
  const changeValidatorsTarget = useUnit(positionActions.$changeValidatorsTarget);

  const [openRowId, setOpenRowId] = useState<string | null>(null);

  // A row is looked up rather than stored: the position keeps updating while the
  // drawer is open, and a snapshot taken at click time would go stale on screen.
  const openRow = useMemo<PositionRow | null>(
    () => rows.find((row) => row.id === openRowId) ?? null,
    [rows, openRowId],
  );

  const startStakingWired = wiredActions.includes('startStaking');

  const handleRowClick = useCallback((row: PositionRow) => setOpenRowId(row.id), []);
  const closeDrawer = useCallback(() => setOpenRowId(null), []);
  const closePicker = useCallback(() => positionActions.events.changeValidatorsClosed(), []);
  const startStaking = useCallback(() => positionActions.events.startStakingRequested(), []);

  return (
    <DashboardWidget>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <SmallTitleText>{t('dashboard.staking.positions.title')}</SmallTitleText>
          {rows.length > 0 ? <CountChip count={rows.length} /> : null}
        </div>

        <Tooltip open={startStakingWired ? false : undefined}>
          <Tooltip.Trigger>
            <div>
              <Button
                variant="text"
                size="sm"
                disabled={!startStakingWired}
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
        <PositionsEmptyState startStakingWired={startStakingWired} onStartStaking={startStaking} />
      ) : null}

      {rows.length > 0 ? <PositionsTable rows={rows} onRowClick={handleRowClick} /> : null}

      <PositionDetailDrawer row={openRow} onClose={closeDrawer} />

      <ValidatorSelectionModal isOpen={changeValidatorsTarget !== null} onClose={closePicker} />
    </DashboardWidget>
  );
};
