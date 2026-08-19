import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, formatFiatBalance, toAccountId, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, SmallTitleText } from '@/shared/ui';
import { CHART_TOOLTIP_STYLE, FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { VoteChart } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { NamedAccount } from '@/widgets/NameResolver';
import { type ActiveReferendum, type OurVote } from '../hooks/useActiveReferendums';

type Props = {
  referendum: ActiveReferendum;
  onClose: () => void;
};

type VoteRow = OurVote & {
  colorIndex: number;
  amountNum: number;
};

export const ReferendumDetailModal = memo(({ referendum, onClose }: Props) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[referendum.chainId];

  const ayePercent = referendum.ayePercent * 100;

  const rows: VoteRow[] = useMemo(
    () =>
      referendum.ourVotes.map((vote, i) => ({
        ...vote,
        colorIndex: i,
        amountNum: parseFloat(vote.amount),
      })),
    [referendum.ourVotes],
  );

  const chartData = useMemo(
    () =>
      rows
        .map((row, i) => ({
          name: row.name || toShortAddress(row.address),
          value: parseFloat(row.amountFiat),
          fill: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const totalVoteFiat = chartData.reduce((sum, d) => sum + d.value, 0);
  const chartDataWithPercent = chartData.map((d) => ({
    ...d,
    percent: totalVoteFiat > 0 ? (d.value / totalVoteFiat) * 100 : 0,
  }));

  const { formatted: lockedFormatted } = formatBalance(referendum.totalLocked, referendum.precision);

  const columns: Column<VoteRow>[] = useMemo(
    () => [
      {
        key: 'name',
        title: t('dashboard.activeReferendums.detail.account'),
        width: '33%',
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
        key: 'direction',
        title: t('dashboard.activeReferendums.detail.vote'),
        width: '12%',
        render: (_, item) => {
          const colorClass =
            item.direction === 'aye'
              ? 'text-text-positive'
              : item.direction === 'nay'
                ? 'text-text-negative'
                : 'text-text-tertiary';

          const label =
            item.direction === 'aye'
              ? t('dashboard.activeReferendums.aye')
              : item.direction === 'nay'
                ? t('dashboard.activeReferendums.nay')
                : t('dashboard.activeReferendums.abstain');

          return <FootnoteText className={cnTw('font-semibold', colorClass)}>{label}</FootnoteText>;
        },
      },
      {
        key: 'amountNum',
        title: t('dashboard.activeReferendums.detail.amount'),
        sortable: true,
        width: '20%',
        render: (_, item) => {
          const bal = formatBalance(item.amount, item.precision);

          return (
            <FootnoteText className="tabular-nums">
              {bal.formatted} {item.symbol}
            </FootnoteText>
          );
        },
      },
      {
        key: 'conviction',
        title: t('dashboard.activeReferendums.detail.conviction'),
        width: '15%',
        render: (_, item) => <FootnoteText className="tabular-nums">{item.conviction}</FootnoteText>,
      },
      {
        key: 'amountFiat',
        title: t('dashboard.activeReferendums.detail.value'),
        width: '20%',
        render: (_, item) => (
          // eslint-disable-next-line i18next/no-literal-string
          <FootnoteText className="tabular-nums">${formatFiatBalance(item.amountFiat).formatted}</FootnoteText>
        ),
      },
    ],
    [t, chain],
  );

  return (
    <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.activeReferendums.detail.title')}</Modal.Title>
      <Modal.Content disableScroll>
        {/* Header section */}
        <div className="flex items-center gap-3 px-5 py-3">
          <img src={referendum.chainIcon} alt={referendum.chainName} className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <FootnoteText className="font-bold">{referendum.title}</FootnoteText>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <FootnoteText className="font-mono text-text-tertiary">#{referendum.id}</FootnoteText>
              {/* eslint-disable-next-line i18next/no-literal-string */}
              <FootnoteText className="text-text-tertiary">·</FootnoteText>
              <FootnoteText className="text-text-tertiary">{referendum.chainName}</FootnoteText>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <FootnoteText className="font-bold tabular-nums">
              {lockedFormatted} {referendum.symbol}
            </FootnoteText>
            {/* eslint-disable-next-line i18next/no-literal-string */}
            <FootnoteText className="text-text-tertiary tabular-nums">
              ${formatFiatBalance(referendum.totalLockedFiat).formatted}
            </FootnoteText>
          </div>
        </div>

        {/* Aye/Nay bar */}
        <div className="flex items-center gap-3 px-5 py-2">
          <FootnoteText className="text-text-positive">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t('dashboard.activeReferendums.aye')} {ayePercent.toFixed(1)}%
          </FootnoteText>
          <div className="flex-1">
            <VoteChart value={ayePercent} />
          </div>
          <FootnoteText className="text-text-negative">
            {/* eslint-disable-next-line i18next/no-literal-string */}
            {t('dashboard.activeReferendums.nay')} {(100 - ayePercent).toFixed(1)}%
          </FootnoteText>
        </div>

        <div className="border-t border-divider" />

        {/* Our Votes section */}
        {rows.length > 0 && (
          <>
            <div className="px-5 pt-4 pb-2">
              <SmallTitleText>{t('dashboard.activeReferendums.detail.ourVotes')}</SmallTitleText>
            </div>

            {chartDataWithPercent.length > 0 && (
              <div className="flex justify-center py-2">
                <PieChart width={180} height={180}>
                  <Pie
                    data={chartDataWithPercent}
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

            <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 300 }}>
              <Table columns={columns} data={rows} />
            </div>
          </>
        )}

        {rows.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <FootnoteText className="text-text-tertiary">&mdash;</FootnoteText>
          </div>
        )}
      </Modal.Content>
    </Modal>
  );
});

type ChartTooltipProps = {
  active?: boolean;
  payload?: { payload: { name: string; percent: number } }[];
};

const ChartTooltip = memo(({ active, payload }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{item.payload.name}</div>
      {/* eslint-disable-next-line i18next/no-literal-string */}
      <div>{item.payload.percent.toFixed(1)}%</div>
    </div>
  );
});
