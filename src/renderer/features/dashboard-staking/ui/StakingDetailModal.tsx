import { memo, useCallback, useMemo, useState } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAccountId, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon, Loader } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type StakingMap } from '@/domains/staking';
import { ValidatorsModal } from '@/entities/staking';
import { useNominatedValidators } from '../hooks/useNominatedValidators';
import { type EntryLike, type StakingBreakdownRow, useStakingBreakdown } from '../hooks/useStakingBreakdown';
import { type ChainStakingSummary } from '../hooks/useStakingOverview';

import { ChartTooltip } from './ChartTooltip';
import { Price } from './Price';

type Props = {
  chainSummary: ChainStakingSummary;
  stakingData: StakingMap;
  accountIds: string[];
  allEntries: EntryLike[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

/**
 * @deprecated Superseded by `BreakdownModal` and `PositionsModal` of
 *   `features/dashboard-staking-kpi`. Reachable only from the deprecated
 *   `StakingOverviewWidget`.
 */
export const StakingDetailModal = memo(
  ({ chainSummary, stakingData, accountIds, allEntries, currency, onClose }: Props) => {
    const { t } = useI18n();
    const { rows } = useStakingBreakdown({ stakingData, chainSummary, accountIds, allEntries });
    const { formatted, suffix } = formatBalance(chainSummary.totalStaked, chainSummary.precision);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const stash = selectedAccountId ? (stakingData[toAccountId(selectedAccountId)]?.stash ?? null) : null;

    const { elected, notElected, identities, chain, asset, pending } = useNominatedValidators(
      chainSummary.chainId,
      stash,
    );
    const hasNominations = elected.length > 0 || notElected.length > 0;

    const chartData = useMemo(() => {
      const totalFiat = rows.reduce((sum, r) => sum + r.fiatValueNum, 0);

      return rows
        .map((row, i) => ({
          name: row.name || toShortAddress(row.address),
          value: row.fiatValueNum,
          percent: totalFiat > 0 ? (row.fiatValueNum / totalFiat) * 100 : 0,
          index: i,
          fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }))
        .filter((d) => d.value > 0);
    }, [rows]);

    const columns: Column<StakingBreakdownRow>[] = useMemo(
      () => [
        {
          key: 'name',
          title: t('dashboard.stakingOverview.stakingDetail.account'),
          width: '33%',
          render: (_, item) => (
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: FALLBACK_COLORS[item.colorIndex % FALLBACK_COLORS.length] }}
              />
              <Identicon address={toAddress(item.address)} />
              <div className="min-w-0">
                <FootnoteText className="truncate font-semibold">{item.name}</FootnoteText>
                <FootnoteText className="text-text-tertiary">{toShortAddress(item.address)}</FootnoteText>
              </div>
            </div>
          ),
        },
        {
          key: 'rawAmountNum',
          title: t('dashboard.stakingOverview.stakingDetail.staked'),
          sortable: true,
          width: '23%',
          render: (_, item) => {
            const bal = formatBalance(item.rawAmount, item.precision);

            return (
              <FootnoteText className="tabular-nums">
                {bal.formatted}
                {bal.suffix} {item.symbol}
              </FootnoteText>
            );
          },
        },
        {
          key: 'fiatValueNum',
          title: t('dashboard.stakingOverview.stakingDetail.value'),
          sortable: true,
          width: '20%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              <Price amount={item.fiatValue} currency={currency} />
            </FootnoteText>
          ),
        },
        {
          key: 'sharePercent',
          title: t('dashboard.stakingOverview.stakingDetail.share'),
          sortable: true,
          width: '16%',
          render: (_, item) => <FootnoteText className="tabular-nums">{item.sharePercent.toFixed(1)}%</FootnoteText>,
        },
        {
          key: 'accountId',
          title: '',
          width: '8%',
          render: () => <Icon name="right" size={16} className="text-text-tertiary" />,
        },
      ],
      [t, currency],
    );

    const handleRowClick = useCallback((row: StakingBreakdownRow) => setSelectedAccountId(row.accountId), []);
    const handleClearSelection = useCallback(() => setSelectedAccountId(null), []);

    const showChart = chartData.length > 1;
    const showValidatorsModal = selectedAccountId !== null && !pending;
    const showLoadingModal = selectedAccountId !== null && pending;

    return (
      <>
        <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
          <Modal.Title close>
            {t('dashboard.stakingOverview.stakingDetail.title', { chain: chainSummary.chainName })}
          </Modal.Title>
          <Modal.Content disableScroll>
            <div className="flex items-center gap-3 px-5 py-3">
              <img src={chainSummary.icon.colored} alt={chainSummary.chainName} className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <FootnoteText className="font-bold">{chainSummary.chainName}</FootnoteText>
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.stakingOverview.stakingDetail.accountCount', { count: rows.length })}
                </FootnoteText>
              </div>
              <div className="shrink-0">
                <FootnoteText align="right" className="font-bold tabular-nums">
                  {formatted}
                  {suffix ? ` ${suffix}` : ''} {chainSummary.symbol}
                </FootnoteText>
                <FootnoteText align="right" className="text-text-tertiary tabular-nums">
                  <Price amount={chainSummary.fiatValue} currency={currency} />
                </FootnoteText>
              </div>
            </div>

            <div className="border-t border-divider" />

            {showChart && (
              <div className="flex justify-center px-5 py-3">
                <PieChart width={180} height={180}>
                  <Pie
                    data={chartData}
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    stroke="none"
                    animationDuration={400}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </div>
            )}

            <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 440 }}>
              <Table columns={columns} data={rows} onRowClick={handleRowClick} />
            </div>
          </Modal.Content>
        </Modal>

        {showLoadingModal && (
          <Modal isOpen size="sm" onToggle={handleClearSelection}>
            <Modal.Title close>{t('staking.confirmation.validatorsTitle')}</Modal.Title>
            <Modal.Content>
              <div className="flex items-center justify-center py-10">
                <Loader color="primary" size={24} />
              </div>
            </Modal.Content>
          </Modal>
        )}

        {showValidatorsModal && hasNominations && (
          <ValidatorsModal
            isOpen
            selectedValidators={elected}
            notSelectedValidators={notElected}
            identities={identities}
            asset={asset}
            chain={chain ?? undefined}
            onClose={handleClearSelection}
          />
        )}

        {showValidatorsModal && !hasNominations && (
          <Modal isOpen size="sm" onToggle={handleClearSelection}>
            <Modal.Title close>{t('staking.confirmation.validatorsTitle')}</Modal.Title>
            <Modal.Content>
              <div className="flex items-center justify-center py-10">
                <FootnoteText className="text-text-tertiary">{t('staking.validators.noValidatorsLabel')}</FootnoteText>
              </div>
            </Modal.Content>
          </Modal>
        )}
      </>
    );
  },
);
