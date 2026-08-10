import { useUnit } from 'effector-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { type VotingMap } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { type EntryLike, type GovernanceBreakdownRow, useGovernanceBreakdown } from '../hooks/useGovernanceBreakdown';
import { type ChainGovernanceSummary } from '../hooks/useGovernanceOverview';

import { AccountTracksModal } from './AccountTracksModal';
import { ChartTooltip } from './ChartTooltip';
import { Price } from './Price';
import { buildChartData } from './buildChartData';

type Props = {
  chainSummary: ChainGovernanceSummary;
  votingMap: VotingMap;
  accountIds: string[];
  allEntries: EntryLike[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const GovernanceDetailModal = memo(
  ({ chainSummary, votingMap, accountIds, allEntries, currency, onClose }: Props) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const chain = chains[chainSummary.chainId];
    const { rows } = useGovernanceBreakdown({ votingMap, chainSummary, accountIds, allEntries });
    const { formatted, suffix } = formatBalance(chainSummary.totalLocked, chainSummary.precision);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const chartData = useMemo(
      () =>
        buildChartData(
          rows,
          (r) => r.name || toShortAddress(r.address),
          (r) => r.fiatValueNum,
        ),
      [rows],
    );

    const columns: Column<GovernanceBreakdownRow>[] = useMemo(
      () => [
        {
          key: 'name',
          title: t('dashboard.governanceOverview.governanceDetail.account'),
          width: '30%',
          render: (_, item) => (
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: FALLBACK_COLORS[item.colorIndex % FALLBACK_COLORS.length] }}
              />
              <NamedAccount accountId={toAccountId(item.address)} chain={chain} variant="short" iconSize={20} />
            </div>
          ),
        },
        {
          key: 'rawAmountNum',
          title: t('dashboard.governanceOverview.governanceDetail.locked'),
          sortable: true,
          width: '20%',
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
          key: 'averageConviction',
          title: t('dashboard.governanceOverview.governanceDetail.conviction'),
          sortable: true,
          width: '12%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              {t('dashboard.governanceOverview.convictionDisplay', {
                value: item.averageConviction.toFixed(1),
              })}
            </FootnoteText>
          ),
        },
        {
          key: 'fiatValueNum',
          title: t('dashboard.governanceOverview.governanceDetail.value'),
          sortable: true,
          width: '16%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              <Price amount={item.fiatValue} currency={currency} />
            </FootnoteText>
          ),
        },
        {
          key: 'sharePercent',
          title: t('dashboard.governanceOverview.governanceDetail.share'),
          sortable: true,
          width: '14%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              {item.sharePercent.toFixed(1)}%
            </FootnoteText>
          ),
        },
        {
          key: 'accountId',
          title: '',
          width: '8%',
          render: () => <Icon name="right" size={16} className="text-text-tertiary" />,
        },
      ],
      [t, currency, chain],
    );

    const handleRowClick = useCallback((row: GovernanceBreakdownRow) => setSelectedAccountId(row.accountId), []);
    const handleClearSelection = useCallback(() => setSelectedAccountId(null), []);

    const showChart = chartData.length > 0;

    const selectedRow = selectedAccountId ? rows.find((r) => r.accountId === selectedAccountId) : null;

    return (
      <>
        <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
          <Modal.Title close>
            {t('dashboard.governanceOverview.governanceDetail.title', { chain: chainSummary.chainName })}
          </Modal.Title>
          <Modal.Content disableScroll>
            <div className="flex items-center gap-3 px-5 py-3">
              <img src={chainSummary.icon.colored} alt={chainSummary.chainName} className="h-8 w-8" />
              <div className="min-w-0 flex-1">
                <FootnoteText className="font-bold">{chainSummary.chainName}</FootnoteText>
                <FootnoteText className="text-text-tertiary">
                  {t('dashboard.governanceOverview.governanceDetail.accountCount', { count: rows.length })}
                </FootnoteText>
              </div>
              <div className="shrink-0">
                <FootnoteText align="right" className="font-bold tabular-nums">
                  {formatted}
                  {suffix ? ` ${suffix}` : ''} {chainSummary.symbol}
                </FootnoteText>
                <FootnoteText align="right" className="text-text-tertiary tabular-nums">
                  <Price amount={chainSummary.totalLockedFiat} currency={currency} />
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

        {selectedRow && (
          <AccountTracksModal
            accountId={selectedRow.accountId}
            accountName={selectedRow.name}
            accountAddress={selectedRow.address}
            votingMap={votingMap}
            chainSummary={chainSummary}
            currency={currency}
            onClose={handleClearSelection}
          />
        )}
      </>
    );
  },
);
