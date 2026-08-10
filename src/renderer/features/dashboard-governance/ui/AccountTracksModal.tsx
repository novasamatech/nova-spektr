import { BN_ZERO } from '@polkadot/util';
import { default as BigNumber } from 'bignumber.js';
import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { type Conviction, type TrackId, type VotingMap } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { formatBalance, getRoundedValue, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { getTrackMeta } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { useAccountName } from '@/domains/network';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { votingService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { NamedAccount } from '@/widgets/NameResolver';
import { type ChainGovernanceSummary } from '../hooks/useGovernanceOverview';

import { ChartTooltip } from './ChartTooltip';
import { Price } from './Price';
import { buildChartData } from './buildChartData';

type TrackBreakdownRow = {
  trackId: TrackId;
  trackName: string;
  rawAmount: string;
  rawAmountNum: number;
  conviction: string;
  fiatValue: string;
  fiatValueNum: number;
  sharePercent: number;
  precision: number;
  symbol: string;
  colorIndex: number;
};

type Props = {
  accountId: string;
  accountName: string;
  accountAddress: string;
  votingMap: VotingMap;
  chainSummary: ChainGovernanceSummary;
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const AccountTracksModal = memo(
  ({ accountId, accountName, accountAddress, votingMap, chainSummary, currency, onClose }: Props) => {
    const { t } = useI18n();
    const chains = useUnit(networkModel.$chains);
    const chain = chains[chainSummary.chainId];
    const resolvedAccountId = toAccountId(accountAddress);
    // The title names the account too, and it must be the same name the row
    // under it shows — hence the resolver rather than the passed-in `name`.
    const resolvedName = useAccountName({ accountId: resolvedAccountId, chain });
    const pricesParams = useUnit(currencySelect.$currentPricesParams);
    const { data: prices } = useAssetsPrices(pricesParams);

    const rows = useMemo(() => {
      const typedAccountId = accountId as keyof VotingMap;
      const trackVoting = votingMap[typedAccountId];
      if (!trackVoting) return [];

      const priceItem = currency && prices ? prices[chainSummary.priceId]?.[currency.coingeckoId] : null;

      const rawRows: TrackBreakdownRow[] = [];
      let totalFiat = new BigNumber(0);

      for (const [trackId, voting] of Object.entries(trackVoting)) {
        let lockAmount = BN_ZERO;
        let conviction: Conviction = 'None';

        if (votingService.isCasting(voting)) {
          for (const vote of Object.values(voting.votes)) {
            const amount = votingService.calculateAccountVoteAmount(vote);
            if (amount.gt(lockAmount)) {
              lockAmount = amount;
              conviction = votingService.getAccountVoteConviction(vote);
            }
          }
          if (voting.prior?.amount && voting.prior.amount.gt(lockAmount)) {
            lockAmount = voting.prior.amount;
          }
        } else if (votingService.isDelegating(voting)) {
          lockAmount = voting.balance;
          conviction = voting.conviction;
          if (voting.prior?.amount && voting.prior.amount.gt(lockAmount)) {
            lockAmount = voting.prior.amount;
          }
        }

        if (lockAmount.isZero()) continue;

        const fiat = priceItem
          ? new BigNumber(getRoundedValue(lockAmount.toString(), priceItem.price, chainSummary.precision))
          : new BigNumber(0);

        totalFiat = totalFiat.plus(fiat);

        const multiplier = votingService.getConvictionMultiplier(conviction);
        const convictionDisplay = conviction === 'None' ? 'None' : `${multiplier}x`;

        const trackMeta = getTrackMeta(trackId);

        rawRows.push({
          trackId,
          trackName: t(trackMeta.title),
          rawAmount: lockAmount.toString(),
          rawAmountNum: new BigNumber(lockAmount.toString()).toNumber(),
          conviction: convictionDisplay,
          fiatValue: fiat.toString(),
          fiatValueNum: fiat.toNumber(),
          sharePercent: 0,
          precision: chainSummary.precision,
          symbol: chainSummary.symbol,
          colorIndex: 0,
        });
      }

      rawRows.sort((a, b) => b.fiatValueNum - a.fiatValueNum);

      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i]!;
        row.colorIndex = i;
        row.sharePercent = totalFiat.gt(0)
          ? Math.round(new BigNumber(row.fiatValue).div(totalFiat).times(1000).toNumber()) / 10
          : 0;
      }

      return rawRows;
    }, [accountId, votingMap, chainSummary, prices, currency, t]);

    const chartData = useMemo(
      () =>
        buildChartData(
          rows,
          (r) => r.trackName,
          (r) => r.fiatValueNum,
        ),
      [rows],
    );

    const displayName = resolvedName || accountName || toShortAddress(accountAddress);

    const totalLocked = useMemo(() => {
      return rows.reduce((max, row) => {
        const rowBN = new BigNumber(row.rawAmount);

        return rowBN.gt(max) ? rowBN : max;
      }, new BigNumber(0));
    }, [rows]);

    const { formatted, suffix } = formatBalance(totalLocked.toString(), chainSummary.precision);

    const columns: Column<TrackBreakdownRow>[] = useMemo(
      () => [
        {
          key: 'trackName',
          title: t('dashboard.governanceOverview.trackDetail.track'),
          width: '40%',
          render: (_, item) => (
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: FALLBACK_COLORS[item.colorIndex % FALLBACK_COLORS.length] }}
              />
              <FootnoteText className="truncate font-semibold">{item.trackName}</FootnoteText>
            </div>
          ),
        },
        {
          key: 'rawAmountNum',
          title: t('dashboard.governanceOverview.trackDetail.locked'),
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
          key: 'conviction',
          title: t('dashboard.governanceOverview.trackDetail.conviction'),
          width: '12%',
          render: (_, item) => <FootnoteText className="tabular-nums">{item.conviction}</FootnoteText>,
        },
        {
          key: 'fiatValueNum',
          title: t('dashboard.governanceOverview.trackDetail.value'),
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
          title: t('dashboard.governanceOverview.trackDetail.share'),
          sortable: true,
          width: '12%',
          render: (_, item) => (
            <FootnoteText className="tabular-nums">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              {item.sharePercent.toFixed(1)}%
            </FootnoteText>
          ),
        },
      ],
      [t, currency],
    );

    const showChart = chartData.length > 0;

    return (
      <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
        <Modal.Title close>{t('dashboard.governanceOverview.trackDetail.title', { account: displayName })}</Modal.Title>
        <Modal.Content disableScroll>
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <NamedAccount accountId={resolvedAccountId} chain={chain} variant="short" iconSize={32} />
            </div>
            <div className="shrink-0">
              <FootnoteText align="right" className="font-bold tabular-nums">
                {formatted}
                {suffix ? ` ${suffix}` : ''} {chainSummary.symbol}
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
