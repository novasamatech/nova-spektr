import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';

import { type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { buildCsv, downloadCsv } from '@/shared/lib/csv';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { Button, FootnoteText, HelpText } from '@/shared/ui';
import { getColorByIndex } from '@/shared/ui/chart-constants';
import { type Column, Checkbox, EmptyMessage, Label, Modal, Table, Tooltip } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { formatAssetAmount, formatAssetAmounts, sumFiat } from '../lib/amounts';
import { type CsvClaimRow, claimCsvColumns, csvFileName } from '../lib/csv';
import { DEFAULT_CLAIM_WINDOW_ERAS, daysUntilExpiry, erasUntilExpiry, oldestPayoutEra } from '../lib/expiry';
import { formatFiat } from '../lib/format-fiat';
import { computeSelectionTotals, getSelectAllState, isClaimable, toggleRow, toggleSelectAll } from '../lib/selection';
import { type ClaimRow } from '../lib/types';
import { dashboardStakingKpiActions } from '../model/actions';

import { DonutBreakdown } from './DonutBreakdown';
import { Price } from './Price';

type TableRow = ClaimRow & { selected: boolean; expiryDays: number | null };

type Props = {
  rows: ClaimRow[];
  currency: CurrencyItem | null;
  /** Active era per chain — turns a payout era into an expiry countdown. */
  eras: Record<string, number | undefined>;
  eraDurations: Record<string, number | null>;
  /** Runtime `HistoryDepth` per chain — how far back a payout stays claimable. */
  historyDepths: Record<string, number | null>;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

/**
 * The Rewards card's drill-down: pick the accounts to claim for, see what each
 * has earned and what is about to expire, then hand the selection to the claim
 * flow.
 */
export const ClaimModal = memo(
  ({ rows, currency, eras, eraDurations, historyDepths, walletByAccount, onClose }: Props) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const enabledActions = useUnit(dashboardStakingKpiActions.$enabledActions);
    const claimEnabled = enabledActions.includes('claim');
    const claimRequested = useUnit(dashboardStakingKpiActions.claimRequested);

    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const selected = useMemo(() => new Set(selectedKeys), [selectedKeys]);

    const tableRows = useMemo<TableRow[]>(() => {
      return rows.map((row) => {
        const oldest = oldestPayoutEra(row.eras);
        const activeEra = eras[row.chainId];
        const expiryDays =
          oldest === null || activeEra === undefined
            ? null
            : daysUntilExpiry(
                erasUntilExpiry(oldest, activeEra, historyDepths[row.chainId] ?? undefined),
                eraDurations[row.chainId] ?? null,
              );

        return { ...row, selected: selected.has(row.key), expiryDays };
      });
    }, [rows, eras, eraDurations, historyDepths, selected]);

    const totals = useMemo(() => computeSelectionTotals(rows, selected), [rows, selected]);
    const selectAllState = getSelectAllState(rows, selected);

    const slices = useMemo(
      () =>
        rows
          .filter((row) => Number(row.unclaimedFiat) > 0)
          .map((row, index) => ({ id: row.key, value: Number(row.unclaimedFiat), color: getColorByIndex(index) })),
      [rows],
    );

    // `sumFiat`, not a float reduce: the cards sum the very same figures with
    // BigNumber, and `Number#toString` renders dust as `1e-7`, so the two surfaces
    // could show different totals for one set of rows.
    const unclaimedTotalFiat = useMemo(() => sumFiat(rows.map((row) => row.unclaimedFiat)), [rows]);

    const soonestExpiry = useMemo(() => {
      const values = tableRows
        .filter((row) => Number(row.unclaimed) > 0 && row.expiryDays !== null)
        .map((row) => row.expiryDays!);

      return values.length > 0 ? Math.min(...values) : null;
    }, [tableRows]);

    const hoveredRow = hoveredId === null ? null : (tableRows.find((row) => row.key === hoveredId) ?? null);

    const handleToggleAll = useCallback(() => setSelectedKeys(toggleSelectAll(rows, selected)), [rows, selected]);
    const handleToggleRow = useCallback((key: string) => setSelectedKeys((prev) => toggleRow(new Set(prev), key)), []);

    const handleExport = useCallback(() => {
      const csvRows: CsvClaimRow[] = rows.map((row) => ({
        ...row,
        address: toAddress(row.accountId, { prefix: chains[row.chainId]?.addressPrefix }),
        accountName: walletByAccount[row.accountId]?.name ?? '',
      }));

      const columns = claimCsvColumns({
        account: t('dashboard.staking.kpi.columns.account'),
        address: t('dashboard.staking.kpi.columns.address'),
        network: t('dashboard.staking.kpi.columns.network'),
        asset: t('dashboard.staking.kpi.columns.asset'),
        earned: t('dashboard.staking.kpi.columns.earned'),
        unclaimed: t('dashboard.staking.kpi.columns.unclaimed'),
        eras: t('dashboard.staking.kpi.columns.eras'),
      });

      downloadCsv(csvFileName('rewards'), buildCsv(columns, csvRows));
    }, [rows, chains, walletByAccount, t]);

    const handleClaim = useCallback(() => {
      claimRequested({ requests: totals.requests });
    }, [claimRequested, totals.requests]);

    const columns = useMemo<Column<TableRow>[]>(
      () => [
        {
          key: 'selected',
          width: '48px',
          title: (
            <Checkbox
              checked={selectAllState === 'all'}
              semiChecked={selectAllState === 'some'}
              disabled={selectAllState === 'none' && rows.every((row) => !isClaimable(row))}
              onChange={handleToggleAll}
            />
          ),
          render: (_, item) => (
            <Checkbox
              checked={item.selected}
              disabled={!isClaimable(item)}
              onChange={() => handleToggleRow(item.key)}
              onClick={(event) => event.stopPropagation()}
            />
          ),
        },
        {
          key: 'accountId',
          title: t('dashboard.staking.kpi.columns.account'),
          width: '36%',
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
          key: 'earned',
          title: t('dashboard.staking.kpi.columns.earned'),
          width: '20%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              {formatAssetAmount({ symbol: item.symbol, precision: item.precision, amount: item.earned })}
            </FootnoteText>
          ),
        },
        {
          key: 'unclaimed',
          title: t('dashboard.staking.kpi.columns.unclaimed'),
          width: '22%',
          render: (_, item) => {
            return (
              <div>
                <FootnoteText className={cnTw('tabular-nums', Number(item.unclaimed) > 0 && 'text-text-positive')}>
                  {formatAssetAmount({ symbol: item.symbol, precision: item.precision, amount: item.unclaimed })}
                </FootnoteText>
                <HelpText className="text-text-tertiary tabular-nums">
                  <Price amount={item.unclaimedFiat} currency={currency} />
                </HelpText>
              </div>
            );
          },
        },
        {
          key: 'eras',
          title: t('dashboard.staking.kpi.columns.eras'),
          width: '18%',
          render: (_, item) => {
            if (item.eras.length === 0) {
              return <HelpText className="text-text-tertiary">—</HelpText>;
            }

            return (
              <Tooltip>
                <Tooltip.Trigger>
                  <div className="w-fit">
                    <Label variant="gray">
                      {t('dashboard.staking.kpi.rewards.eraCount', { count: item.eras.length })}
                    </Label>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>
                  {t('dashboard.staking.kpi.rewards.claimWindowHint', {
                    eras: historyDepths[item.chainId] ?? DEFAULT_CLAIM_WINDOW_ERAS,
                  })}
                </Tooltip.Content>
              </Tooltip>
            );
          },
        },
      ],
      [t, chains, walletByAccount, currency, selectAllState, rows, historyDepths, handleToggleAll, handleToggleRow],
    );

    const summaryLine =
      totals.count === 0
        ? t('dashboard.staking.kpi.rewards.nothingSelected')
        : t('dashboard.staking.kpi.rewards.selectedSummary', {
            count: totals.count,
            amounts: formatAssetAmounts(totals.amounts),
            fiat: formatFiat(totals.fiat, currency),
          });

    return (
      <Modal isOpen size="xl" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>{t('dashboard.staking.kpi.rewards.detailTitle')}</Modal.Title>
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
                        <Price amount={hoveredRow.unclaimedFiat} currency={currency} />
                      </FootnoteText>
                      <HelpText className="text-text-tertiary">{hoveredRow.chainName}</HelpText>
                    </>
                  ) : (
                    <>
                      <FootnoteText className="font-bold">
                        <Price amount={unclaimedTotalFiat} currency={currency} />
                      </FootnoteText>
                      <HelpText className="text-text-tertiary">
                        {t('dashboard.staking.kpi.rewards.unclaimedTotal')}
                      </HelpText>
                    </>
                  )}
                </DonutBreakdown>
                {soonestExpiry !== null && (
                  <HelpText className="text-center text-text-tertiary">
                    {t('dashboard.staking.kpi.rewards.oldestExpires', { count: soonestExpiry })}
                  </HelpText>
                )}
              </div>

              <div className="min-w-0 flex-1 overflow-y-auto" style={{ maxHeight: 420 }}>
                <Table
                  columns={columns}
                  data={tableRows}
                  getRowKey={(item) => item.key}
                  rowProps={(item) => ({ disabled: !isClaimable(item), selected: item.selected })}
                />
              </div>
            </div>
          )}
        </Modal.Content>

        <Modal.Footer align="between">
          <FootnoteText className="text-text-tertiary">{summaryLine}</FootnoteText>
          <div className="flex items-center gap-2">
            <Button variant="text" size="sm" onClick={handleExport}>
              {t('dashboard.staking.kpi.exportCsv')}
            </Button>
            <Tooltip open={claimEnabled ? false : undefined}>
              <Tooltip.Trigger>
                <div>
                  <Button size="sm" disabled={!claimEnabled || totals.count === 0} onClick={handleClaim}>
                    {t('dashboard.staking.kpi.rewards.claimSelected', { count: totals.count })}
                  </Button>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
            </Tooltip>
          </div>
        </Modal.Footer>
      </Modal>
    );
  },
);
