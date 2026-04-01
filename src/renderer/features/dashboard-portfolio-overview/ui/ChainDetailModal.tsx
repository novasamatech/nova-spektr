import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { CHART_TOOLTIP_STYLE, getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type ChainAssetRow, useChainBreakdown } from '../hooks/useChainBreakdown';
import { type ChainHolding } from '../hooks/useChainHoldings';
import { type RowAllocation, computeChainRowAllocations } from '../lib/computeRowAllocations';

import { AllocationBar } from './AllocationBar';
import { Price } from './Price';

type ChainTableRow = ChainAssetRow & { allocation: RowAllocation | null };

type ChartEntry = {
  name: string;
  value: number;
  index: number;
  fill: string;
  row: ChainAssetRow;
};

type TooltipPayloadItem = {
  payload: ChartEntry;
};

const ChartTooltip = memo(({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  if (!item) return null;

  const { row } = item.payload;
  const { formatted, suffix } = formatBalance(row.rawAmount, row.precision);

  return (
    <div style={CHART_TOOLTIP_STYLE}>
      <div style={{ fontWeight: 600 }}>{row.symbol}</div>
      <div>
        {formatted}
        {suffix} {row.symbol}
      </div>
      <div>{row.sharePercent.toFixed(1)}%</div>
    </div>
  );
});

type Props = {
  chainHolding: ChainHolding;
  accountIds: string[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const ChainDetailModal = memo(({ chainHolding, accountIds, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useChainBreakdown(chainHolding.chainId, accountIds);

  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const allocations = useMemo(() => {
    if (!prices || !activeCurrency) return new Map<number, RowAllocation>();

    return computeChainRowAllocations({
      assetIds: rows.map((r) => r.assetId),
      chainId: chainHolding.chainId,
      accountIds,
      balanceMap,
      chains,
      prices,
      currency: activeCurrency,
    });
  }, [rows, chainHolding.chainId, accountIds, balanceMap, chains, prices, activeCurrency]);

  const tableData = useMemo<ChainTableRow[]>(
    () => rows.map((row) => ({ ...row, allocation: allocations.get(row.assetId) ?? null })),
    [rows, allocations],
  );

  const columns = useMemo<Column<ChainTableRow>[]>(
    () => [
      {
        key: 'name',
        title: t('dashboard.portfolioOverview.chainDetail.asset'),
        width: '28%',
        render: (_, item) => (
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: getColorByPriceId(item.priceId, item.colorIndex) }}
            />
            <AssetIcon asset={item} size={24} />
            <FootnoteText className="truncate font-semibold">{item.symbol}</FootnoteText>
          </div>
        ),
      },
      {
        key: 'rawAmountNum',
        title: t('dashboard.portfolioOverview.chainDetail.amount'),
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
        key: 'fiatValueNum',
        title: t('dashboard.portfolioOverview.chainDetail.value'),
        sortable: true,
        width: '18%',
        render: (_, item) => (
          <FootnoteText className="tabular-nums">
            <Price amount={item.fiatValue} currency={currency} />
          </FootnoteText>
        ),
      },
      {
        key: 'sharePercent',
        title: t('dashboard.portfolioOverview.chainDetail.share'),
        sortable: true,
        width: '15%',
        render: (_, item) => <FootnoteText className="tabular-nums">{item.sharePercent.toFixed(1)}%</FootnoteText>,
      },
      {
        key: 'allocation',
        title: t('dashboard.portfolioOverview.assetAllocation'),
        width: '19%',
        render: (_, item) => (item.allocation ? <AllocationBar allocation={item.allocation} /> : null),
      },
    ],
    [t, currency],
  );

  const chartData = useMemo<ChartEntry[]>(
    () =>
      rows
        .map((row, i) => ({
          name: row.symbol,
          value: row.fiatValueNum,
          index: i,
          fill: getColorByPriceId(row.priceId, i),
          row,
        }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const showChart = chartData.length > 1;

  return (
    <Modal isOpen size="lg" onToggle={(open) => !open && onClose()}>
      <Modal.Title close>
        {t('dashboard.portfolioOverview.chainDetail.title', { chainName: chainHolding.chainName })}
      </Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex items-center gap-3 px-5 py-3">
          <img src={chainHolding.chainIcon} alt={chainHolding.chainName} width={32} height={32} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <FootnoteText className="font-bold">{chainHolding.chainName}</FootnoteText>
            <FootnoteText className="text-text-tertiary">
              {t('dashboard.portfolioOverview.chainDetail.assetCount', { count: chainHolding.assetCount })}
            </FootnoteText>
          </div>
          <div className="shrink-0">
            <FootnoteText align="right" className="font-bold tabular-nums">
              <Price amount={chainHolding.fiatValue} currency={currency} />
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
          <Table columns={columns} data={tableData} />
        </div>
      </Modal.Content>
    </Modal>
  );
});
