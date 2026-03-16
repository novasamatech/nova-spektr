import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { CHART_TOOLTIP_STYLE, FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { AssetIcon, Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem } from '@/domains/price';
import { type BreakdownRow, useHoldingBreakdown } from '../hooks/useHoldingBreakdown';
import { type Holding } from '../hooks/useHoldings';

import { Price } from './Price';
import { PriceChangeIndicator } from './PriceChangeIndicator';

type ChartEntry = {
  name: string;
  value: number;
  index: number;
  row: BreakdownRow;
};

type TooltipPayloadItem = {
  payload: ChartEntry;
};

const ChartTooltip = memo(({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  const { row } = item.payload;

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{row.name || toShortAddress(row.address)}</div>
      <div>{row.sharePercent.toFixed(1)}%</div>
    </div>
  );
});

type EntryLike = { accountId: string; name: string; address: string };

type Props = {
  holding: Holding;
  accountIds: string[];
  allEntries: EntryLike[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const AssetDetailModal = memo(({ holding, accountIds, allEntries, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useHoldingBreakdown(holding.priceId, accountIds, allEntries);
  const addressCount = rows.length;
  const { formatted, suffix } = formatBalance(holding.totalRaw, holding.precision);

  const chartData = useMemo<ChartEntry[]>(
    () =>
      rows
        .map((row, i) => ({ name: row.name || toShortAddress(row.address), value: row.fiatValueNum, index: i, row }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const columns: Column<BreakdownRow>[] = [
    {
      key: 'name',
      title: t('dashboard.portfolioOverview.assetDetail.address'),
      width: '35%',
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
      title: t('dashboard.portfolioOverview.assetDetail.amount'),
      sortable: true,
      width: '25%',
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
      title: t('dashboard.portfolioOverview.assetDetail.value'),
      sortable: true,
      width: '22%',
      render: (_, item) => (
        <FootnoteText className="tabular-nums">
          <Price amount={item.fiatValue} currency={currency} />
        </FootnoteText>
      ),
    },
    {
      key: 'sharePercent',
      title: t('dashboard.portfolioOverview.assetDetail.share'),
      sortable: true,
      width: '18%',
      render: (_, item) => <FootnoteText className="tabular-nums">{item.sharePercent.toFixed(1)}%</FootnoteText>,
    },
  ];

  const showChart = chartData.length > 1;

  return (
    <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>{t('dashboard.portfolioOverview.assetDetail.title', { symbol: holding.symbol })}</Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex items-center gap-3 px-5 py-3">
          <AssetIcon asset={holding} size={32} />
          <div className="min-w-0 flex-1">
            <FootnoteText className="font-bold">{holding.symbol}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('dashboard.portfolioOverview.assetDetail.addressCount', { count: addressCount })}
            </FootnoteText>
          </div>
          <div className="shrink-0">
            <FootnoteText align="right" className="font-bold tabular-nums">
              {formatted}
              {suffix} {holding.symbol}
            </FootnoteText>
            <div className="flex items-center justify-end gap-1">
              <PriceChangeIndicator change={holding.change} />
              <FootnoteText align="right" className="text-text-tertiary tabular-nums">
                <Price amount={holding.fiatValue} currency={currency} />
              </FootnoteText>
            </div>
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
              >
                {chartData.map((entry) => (
                  <Cell key={entry.index} fill={FALLBACK_COLORS[entry.index % FALLBACK_COLORS.length]} />
                ))}
              </Pie>
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
});
