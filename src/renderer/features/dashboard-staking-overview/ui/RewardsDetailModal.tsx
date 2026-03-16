import { memo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type RewardsMap } from '@/domains/staking';
import { type RewardsBreakdownRow, useRewardsBreakdown } from '../hooks/useRewardsBreakdown';
import { type EntryLike } from '../hooks/useStakingBreakdown';
import { type ChainRewardsSummary } from '../hooks/useTotalRewards';

import { ChartTooltip } from './ChartTooltip';
import { Price } from './Price';

type Props = {
  chainSummary: ChainRewardsSummary;
  rewardsMap: RewardsMap;
  accountIds: string[];
  allEntries: EntryLike[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const RewardsDetailModal = memo(
  ({ chainSummary, rewardsMap, accountIds, allEntries, currency, onClose }: Props) => {
    const { t } = useI18n();
    const { rows } = useRewardsBreakdown({ rewardsMap, chainSummary, accountIds, allEntries });
    const { formatted, suffix } = formatBalance(chainSummary.totalRewards, chainSummary.precision);

    const totalFiat = rows.reduce((sum, r) => sum + r.fiatValueNum, 0);
    const chartData = rows
      .map((row, i) => ({
        name: row.name || toShortAddress(row.address),
        value: row.fiatValueNum,
        percent: totalFiat > 0 ? (row.fiatValueNum / totalFiat) * 100 : 0,
        index: i,
        fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
      .filter((d) => d.value > 0);

    const columns: Column<RewardsBreakdownRow>[] = [
      {
        key: 'name',
        title: t('dashboard.totalRewards.rewardsDetail.account'),
        width: '40%',
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
        title: t('dashboard.totalRewards.rewardsDetail.rewards'),
        sortable: true,
        width: '27%',
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
        title: t('dashboard.totalRewards.rewardsDetail.value'),
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
        title: t('dashboard.totalRewards.rewardsDetail.share'),
        sortable: true,
        width: '13%',
        render: (_, item) => <FootnoteText className="tabular-nums">{item.sharePercent.toFixed(1)}%</FootnoteText>,
      },
    ];

    const showChart = chartData.length > 1;

    return (
      <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>
          {t('dashboard.totalRewards.rewardsDetail.title', { chain: chainSummary.chainName })}
        </Modal.Title>
        <Modal.Content disableScroll>
          <div className="flex items-center gap-3 px-5 py-3">
            <img src={chainSummary.icon.colored} alt={chainSummary.chainName} className="h-8 w-8" />
            <div className="min-w-0 flex-1">
              <FootnoteText className="font-bold">{chainSummary.chainName}</FootnoteText>
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.totalRewards.rewardsDetail.accountCount', { count: rows.length })}
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
            <Table columns={columns} data={rows} />
          </div>
        </Modal.Content>
      </Modal>
    );
  },
);
