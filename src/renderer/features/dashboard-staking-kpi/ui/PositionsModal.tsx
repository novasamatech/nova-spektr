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
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { canAct } from '../lib/access';
import { type AssetAmount, formatAssetAmount, formatAssetAmounts, sumPlanck } from '../lib/amounts';
import { type CsvPositionRow, csvFileName, positionsCsvColumns } from '../lib/csv';
import { formatFiat } from '../lib/format-fiat';
import { type PositionRow } from '../lib/types';
import { dashboardStakingKpiActions } from '../model/actions';

import { DonutBreakdown } from './DonutBreakdown';
import { Price } from './Price';
import { UnbondingChips } from './UnbondingChips';

type Props = {
  rows: PositionRow[];
  currency: CurrencyItem | null;
  walletByAccount: Record<string, Wallet | null>;
  onClose: () => void;
};

/**
 * The Total-staked card's drill-down: every position, what is unbonding on it,
 * and the actions the account's access mode actually allows. A mode that cannot
 * redeem shows no Redeem button at all rather than a greyed-out one.
 */
export const PositionsModal = memo(({ rows, currency, walletByAccount, onClose }: Props) => {
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

  const totalFiat = useMemo(() => rows.reduce((sum, row) => sum + Number(row.stakedFiat), 0).toString(), [rows]);

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

  const handleExport = useCallback(() => {
    const csvRows: CsvPositionRow[] = rows.map((row) => ({
      ...row,
      address: toAddress(row.accountId, { prefix: chains[row.chainId]?.addressPrefix }),
      accountName: walletByAccount[row.accountId]?.name ?? '',
    }));

    const columns = positionsCsvColumns({
      account: t('dashboard.staking.kpi.columns.account'),
      address: t('dashboard.staking.kpi.columns.address'),
      network: t('dashboard.staking.kpi.columns.network'),
      asset: t('dashboard.staking.kpi.columns.asset'),
      staked: t('dashboard.staking.kpi.columns.staked'),
      unbonding: t('dashboard.staking.kpi.columns.unbonding'),
      redeemable: t('dashboard.staking.kpi.columns.redeemable'),
    });

    downloadCsv(csvFileName('positions'), buildCsv(columns, csvRows));
  }, [rows, chains, walletByAccount, t]);

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
        width: '32%',
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
        key: 'accessMode',
        title: t('dashboard.staking.kpi.columns.actions'),
        width: '18%',
        render: (_, item) => {
          if (!canAct(item.accessMode)) return null;

          const hasRedeemable = Number(item.redeemable) > 0;
          const hasStake = Number(item.staked) > 0;

          // One tooltip per button, not one around both: the two are served by
          // different flows, so one can be live while the other is not.
          return (
            <div className="flex items-center gap-1">
              {hasRedeemable && (
                <Tooltip open={redeemEnabled ? false : undefined}>
                  <Tooltip.Trigger>
                    <div>
                      <Button
                        variant="chip"
                        size="sm"
                        disabled={!redeemEnabled}
                        onClick={() =>
                          redeemRequested({ accountId: item.accountId, chainId: item.chainId, amount: item.redeemable })
                        }
                      >
                        {t('dashboard.staking.kpi.positions.redeem')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
                </Tooltip>
              )}
              {hasStake && (
                <Tooltip open={unbondEnabled ? false : undefined}>
                  <Tooltip.Trigger>
                    <div>
                      <Button
                        variant="text"
                        size="sm"
                        disabled={!unbondEnabled}
                        onClick={() => unbondRequested({ accountId: item.accountId, chainId: item.chainId })}
                      >
                        {t('dashboard.staking.kpi.positions.unbond')}
                      </Button>
                    </div>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{t('dashboard.staking.kpi.actionUnavailable')}</Tooltip.Content>
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
              <Table columns={columns} data={rows} getRowKey={(item) => item.key} />
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
