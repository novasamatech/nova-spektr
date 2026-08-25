import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText } from '@/shared/ui';
import { getColorByIndex } from '@/shared/ui/chart-constants';
import { type Column, EmptyMessage, Modal, Table, Tooltip } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type StakingPosition } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { getBlockedReasonKey } from '@/features/dashboard-staking-positions';
import { NamedAccount } from '@/widgets/NameResolver';
import { useNominationSpread } from '../hooks/useNominationSpread';
import { type AssetAmount, formatAssetAmount, formatAssetAmounts, sumFiat, sumPlanck } from '../lib/amounts';
import { type CsvAllocationRow, allocationCsvColumns, csvFileName } from '../lib/csv';
import { formatFiat } from '../lib/format-fiat';
import { toAllocationRows } from '../lib/spread';
import { type PositionRow } from '../lib/types';
import { dashboardStakingKpiActions } from '../model/actions';

import { DonutBreakdown } from './DonutBreakdown';
import { Price } from './Price';
import { UnbondingChips } from './UnbondingChips';

type Props = {
  rows: PositionRow[];
  /** The positions behind the rows — the export reads their era exposure. */
  positions: StakingPosition[];
  currency: CurrencyItem | null;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

/**
 * The Total-staked card's drill-down: every position, what is unbonding on it,
 * and the actions its access verdict allows. A position that cannot redeem
 * keeps the Redeem button, disabled, with the reason in its tooltip — a control
 * that vanishes cannot tell the user that connecting an address book, or asking
 * an admin, would bring it back.
 */
export const PositionsModal = memo(({ rows, positions, currency, walletByAccount, onClose }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const enabledActions = useUnit(dashboardStakingKpiActions.$enabledActions);
  const redeemRequested = useUnit(dashboardStakingKpiActions.redeemRequested);
  const unbondRequested = useUnit(dashboardStakingKpiActions.unbondRequested);

  const redeemEnabled = enabledActions.includes('redeem');
  const unbondEnabled = enabledActions.includes('unbond');

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const slices = useMemo(
    () =>
      rows
        .filter((row) => Number(row.stakedFiat) > 0)
        .map((row, index) => ({ id: row.key, value: Number(row.stakedFiat), color: getColorByIndex(index) })),
    [rows],
  );

  // `sumFiat`, not a float reduce: the Total staked card sums the very same
  // figures with BigNumber, and the two must never disagree.
  const totalFiat = useMemo(() => sumFiat(rows.map((row) => row.stakedFiat)), [rows]);

  const totalsByAsset = useMemo(() => {
    const byAsset = new Map<string, AssetAmount>();
    for (const row of rows) {
      const existing = byAsset.get(row.symbol);
      if (existing) {
        existing.amount = sumPlanck([existing.amount, row.staked]);
      } else {
        byAsset.set(row.symbol, { symbol: row.symbol, precision: row.precision, amount: row.staked });
      }
    }

    return [...byAsset.values()];
  }, [rows]);

  const hoveredRow = hoveredId === null ? null : (rows.find((row) => row.key === hoveredId) ?? null);

  const allocation = toAllocationRows(useNominationSpread(positions));

  /**
   * Exports where the stake actually sits, not what the table shows.
   *
   * The table is per position — one line per account. The export is per account
   * → validator pair with the amount the era put behind it, because "13.5M
   * staked" says nothing about the concentration underneath it.
   */
  const handleExport = useCallback(() => {
    const csvRows: CsvAllocationRow[] = allocation.map((row) => ({
      ...row,
      address: toAddress(row.accountId, { prefix: chains[row.chainId]?.addressPrefix }),
      accountName: walletByAccount[row.accountId]?.name ?? '',
      validatorAddress: toAddress(row.validatorId, { prefix: chains[row.chainId]?.addressPrefix }),
    }));

    const columns = allocationCsvColumns({
      account: t('dashboard.staking.kpi.columns.account'),
      address: t('dashboard.staking.kpi.columns.address'),
      network: t('dashboard.staking.kpi.columns.network'),
      asset: t('dashboard.staking.kpi.columns.asset'),
      validator: t('dashboard.staking.kpi.columns.validator'),
      allocated: t('dashboard.staking.kpi.columns.allocated'),
      staked: t('dashboard.staking.kpi.columns.staked'),
    });

    downloadCsv(csvFileName('allocation'), buildCsv(columns, csvRows));
  }, [allocation, chains, walletByAccount, t]);

  const columns = useMemo<Column<PositionRow>[]>(
    () => [
      {
        key: 'accountId',
        title: t('dashboard.staking.kpi.columns.account'),
        width: '30%',
        render: (_, item) => (
          <div className="min-w-0">
            <NamedAccount
              accountId={item.accountId}
              chain={chains[item.chainId]}
              wallet={walletByAccount[item.accountId]}
              titleClass="truncate font-semibold"
              variant="short"
              iconSize={24}
              hideExplorers
            />
            <HelpText className="text-text-tertiary">{item.chainName}</HelpText>
          </div>
        ),
      },
      {
        key: 'staked',
        title: t('dashboard.staking.kpi.columns.staked'),
        width: '20%',
        render: (_, item) => {
          return (
            <div>
              <FootnoteText className="font-semibold tabular-nums">
                {formatAssetAmount({ symbol: item.symbol, precision: item.precision, amount: item.staked })}
              </FootnoteText>
              <HelpText className="text-text-tertiary tabular-nums">
                <Price amount={item.stakedFiat} currency={currency} />
              </HelpText>
            </div>
          );
        },
      },
      {
        key: 'unbonding',
        title: t('dashboard.staking.kpi.columns.unbonding'),
        width: '30%',
        render: (_, item) => (
          <UnbondingChips
            chunks={item.unbonding}
            redeemable={item.redeemable}
            symbol={item.symbol}
            precision={item.precision}
          />
        ),
      },
      {
        key: 'access',
        title: t('dashboard.staking.kpi.columns.actions'),
        width: '20%',
        render: (_, item) => {
          const hasRedeemable = Number(item.redeemable) > 0;
          const hasStake = Number(item.staked) > 0;

          // A position the user cannot act on keeps its buttons and says why,
          // rather than showing an empty cell. Both operations are origin-bound
          // — only the stash may withdraw or unbond its own ledger — so the
          // access verdict blocks them outright, ahead of the per-flow wiring.
          const blockedReasonKey = getBlockedReasonKey(item.access);
          const blockedHint = blockedReasonKey === null ? null : t(blockedReasonKey);

          const redeemAllowed = redeemEnabled && blockedReasonKey === null;
          const unbondAllowed = unbondEnabled && blockedReasonKey === null;

          // One tooltip per button, not one around both: the two are served by
          // different flows, so one can be live while the other is not.
          // flex-wrap: the column is fixed-width (`table-layout: fixed`), so
          // when both buttons don't fit side by side they stack instead of
          // painting past the modal edge.
          return (
            <div className="flex flex-wrap items-center gap-1">
              {hasRedeemable && (
                <Tooltip open={redeemAllowed ? false : undefined}>
                  <Tooltip.Trigger>
                    <div>
                      <Button
                        variant="chip"
                        size="sm"
                        disabled={!redeemAllowed}
                        onClick={() =>
                          redeemRequested({ accountId: item.accountId, chainId: item.chainId, amount: item.redeemable })
                        }
                      >
                        {t('dashboard.staking.kpi.positions.redeem')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{blockedHint ?? t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
                </Tooltip>
              )}
              {hasStake && (
                <Tooltip open={unbondAllowed ? false : undefined}>
                  <Tooltip.Trigger>
                    <div>
                      <Button
                        variant="text"
                        size="sm"
                        disabled={!unbondAllowed}
                        onClick={() => unbondRequested({ accountId: item.accountId, chainId: item.chainId })}
                      >
                        {t('dashboard.staking.kpi.positions.unbond')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{blockedHint ?? t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
                </Tooltip>
              )}
            </div>
          );
        },
      },
    ],
    [t, chains, walletByAccount, currency, redeemEnabled, unbondEnabled, redeemRequested, unbondRequested],
  );

  return (
    <Modal isOpen size="xl" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.staking.kpi.positions.detailTitle')}</Modal.Title>
      <Modal.Content disableScroll>
        {rows.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyMessage
              title={t('dashboard.staking.kpi.empty.title')}
              description={t('dashboard.staking.kpi.empty.description')}
            />
          </div>
        ) : (
          <div className="flex gap-6 px-5 py-4">
            <div className="flex w-52 shrink-0 flex-col items-center gap-2">
              <DonutBreakdown data={slices} hoveredId={hoveredId} onHover={setHoveredId}>
                {hoveredRow ? (
                  <>
                    <FootnoteText className="font-bold">
                      <Price amount={hoveredRow.stakedFiat} currency={currency} />
                    </FootnoteText>
                    <HelpText className="text-text-tertiary">{hoveredRow.chainName}</HelpText>
                  </>
                ) : (
                  <>
                    <FootnoteText className="font-bold">
                      <Price amount={totalFiat} currency={currency} />
                    </FootnoteText>
                    <HelpText className="text-text-tertiary">{t('dashboard.staking.kpi.totalStaked.title')}</HelpText>
                  </>
                )}
              </DonutBreakdown>
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
              <Table columns={columns} data={rows} getRowKey={(item) => item.key} stickyHeader />
            </div>
          </div>
        )}
      </Modal.Content>

      <Modal.Footer align="between">
        <FootnoteText className="text-text-tertiary">
          {t('dashboard.staking.kpi.positions.footerTotals', {
            amounts: formatAssetAmounts(totalsByAsset),
            fiat: formatFiat(totalFiat, currency),
          })}
        </FootnoteText>
        <Button variant="text" size="sm" onClick={handleExport}>
          {t('dashboard.staking.kpi.exportCsv')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
});
