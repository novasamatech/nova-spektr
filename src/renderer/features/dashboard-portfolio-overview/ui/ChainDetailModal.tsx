import { useUnit } from 'effector-react';
import { Fragment, memo, useMemo, useState } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { CHART_TOOLTIP_STYLE, getColorByPriceId } from '@/shared/ui/chart-constants';
import { AssetIcon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import '@/shared/ui-kit/Table/Table.css';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type ChainAssetRow, useChainBreakdown } from '../hooks/useChainBreakdown';
import { type ChainHolding } from '../hooks/useChainHoldings';
import { computeChainRowAllocations } from '../lib/computeRowAllocations';

import { AllocationExpandRow } from './AllocationExpandRow';
import { Price } from './Price';

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

type SortKey = 'rawAmountNum' | 'fiatValueNum' | 'sharePercent';

type Props = {
  chainHolding: ChainHolding;
  accountIds: string[];
  currency: CurrencyItem | null;
  onClose: () => void;
};

const COLUMNS = [
  { key: 'name' as const, width: '35%', sortable: false },
  { key: 'rawAmountNum' as const, width: '25%', sortable: true },
  { key: 'fiatValueNum' as const, width: '22%', sortable: true },
  { key: 'sharePercent' as const, width: '18%', sortable: true },
] as const;

const COL_SPAN = COLUMNS.length;

export const ChainDetailModal = memo(({ chainHolding, accountIds, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useChainBreakdown(chainHolding.chainId, accountIds);

  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpanded = (assetId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }

      return next;
    });
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === 'desc') {
        setSortDir('asc');
      } else {
        setSortKey(null);
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows;

    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;

      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const allocations = useMemo(() => {
    if (!prices || !activeCurrency) return new Map();

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

  const columnTitles: Record<string, string> = {
    name: t('dashboard.portfolioOverview.chainDetail.asset'),
    rawAmountNum: t('dashboard.portfolioOverview.chainDetail.amount'),
    fiatValueNum: t('dashboard.portfolioOverview.chainDetail.value'),
    sharePercent: t('dashboard.portfolioOverview.chainDetail.share'),
  };

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
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={cnTw('table-header-cell', {
                        'table-header-cell--sortable': col.sortable,
                        'table-header-cell--active': col.sortable && sortKey === col.key,
                      })}
                      style={{ width: col.width }}
                      onClick={col.sortable ? () => handleSort(col.key as SortKey) : undefined}
                    >
                      <div className="table-header-content">
                        <span>{columnTitles[col.key]}</span>
                        {col.sortable && (
                          <div className="table-sort-indicator">
                            {sortKey === col.key && sortDir === 'asc' && <span className="text-xs">&#8593;</span>}
                            {sortKey === col.key && sortDir === 'desc' && <span className="text-xs">&#8595;</span>}
                            {sortKey !== col.key && <span className="text-xs opacity-30">&#8593;</span>}
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="table-body">
                {sortedRows.map((item) => {
                  const allocation = allocations.get(item.assetId);
                  const expanded = expandedIds.has(item.assetId);
                  const bal = formatBalance(item.rawAmount, item.precision);

                  return (
                    <Fragment key={item.assetId}>
                      <tr
                        className={cnTw('table-row', allocation && 'cursor-pointer')}
                        onClick={allocation ? () => toggleExpanded(item.assetId) : undefined}
                      >
                        <td className="table-cell align-middle" style={{ width: '35%' }}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: getColorByPriceId(item.priceId, item.colorIndex) }}
                            />
                            <AssetIcon asset={item} size={24} />
                            <FootnoteText className="truncate font-semibold">{item.symbol}</FootnoteText>
                            {allocation && (
                              <Icon
                                name="shelfDown"
                                size={16}
                                className={cnTw('ml-auto shrink-0 transition-transform', expanded && '-rotate-180')}
                              />
                            )}
                          </div>
                        </td>
                        <td className="table-cell align-middle" style={{ width: '25%' }}>
                          <FootnoteText className="tabular-nums">
                            {bal.formatted}
                            {bal.suffix} {item.symbol}
                          </FootnoteText>
                        </td>
                        <td className="table-cell align-middle" style={{ width: '22%' }}>
                          <FootnoteText className="tabular-nums">
                            <Price amount={item.fiatValue} currency={currency} />
                          </FootnoteText>
                        </td>
                        <td className="table-cell align-middle" style={{ width: '18%' }}>
                          <FootnoteText className="tabular-nums">{item.sharePercent.toFixed(1)}%</FootnoteText>
                        </td>
                      </tr>
                      {allocation && (
                        <AllocationExpandRow allocation={allocation} colSpan={COL_SPAN} expanded={expanded} />
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
});
