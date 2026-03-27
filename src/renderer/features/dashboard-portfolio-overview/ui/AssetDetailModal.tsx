import { useUnit } from 'effector-react';
import { Fragment, memo, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { useI18n } from '@/shared/i18n';
import { cnTw, formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon } from '@/shared/ui';
import { CHART_TOOLTIP_STYLE, FALLBACK_COLORS } from '@/shared/ui/chart-constants';
import { AssetIcon, Identicon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import '@/shared/ui-kit/Table/Table.css';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BreakdownRow, useHoldingBreakdown } from '../hooks/useHoldingBreakdown';
import { type Holding } from '../hooks/useHoldings';
import { computeAssetRowAllocations } from '../lib/computeRowAllocations';

import { AllocationExpandRow } from './AllocationExpandRow';
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

type SortKey = 'rawAmountNum' | 'fiatValueNum' | 'sharePercent';

type EntryLike = { accountId: string; name: string; address: string };

type Props = {
  holding: Holding;
  accountIds: string[];
  allEntries: EntryLike[];
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

export const AssetDetailModal = memo(({ holding, accountIds, allEntries, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useHoldingBreakdown(holding.priceId, accountIds, allEntries);
  const addressCount = rows.length;
  const { formatted, suffix } = formatBalance(holding.totalRaw, holding.precision);

  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleExpanded = (accountId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
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

    return computeAssetRowAllocations({
      accountIds: rows.map((r) => r.accountId),
      priceId: holding.priceId,
      balanceMap,
      chains,
      prices,
      currency: activeCurrency,
    });
  }, [rows, holding.priceId, balanceMap, chains, prices, activeCurrency]);

  const chartData = useMemo<ChartEntry[]>(
    () =>
      rows
        .map((row, i) => ({ name: row.name || toShortAddress(row.address), value: row.fiatValueNum, index: i, row }))
        .filter((d) => d.value > 0),
    [rows],
  );

  const columnTitles: Record<string, string> = {
    name: t('dashboard.portfolioOverview.assetDetail.address'),
    rawAmountNum: t('dashboard.portfolioOverview.assetDetail.amount'),
    fiatValueNum: t('dashboard.portfolioOverview.assetDetail.value'),
    sharePercent: t('dashboard.portfolioOverview.assetDetail.share'),
  };

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
                  const allocation = allocations.get(item.accountId);
                  const expanded = expandedIds.has(item.accountId);
                  const bal = formatBalance(item.rawAmount, item.precision);

                  return (
                    <Fragment key={item.accountId}>
                      <tr
                        className={cnTw('table-row', allocation && 'cursor-pointer')}
                        onClick={allocation ? () => toggleExpanded(item.accountId) : undefined}
                      >
                        <td className="table-cell align-middle" style={{ width: '35%' }}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                backgroundColor: FALLBACK_COLORS[item.colorIndex % FALLBACK_COLORS.length],
                              }}
                            />
                            <Identicon address={toAddress(item.address)} />
                            <div className="min-w-0">
                              <FootnoteText className="truncate font-semibold">{item.name}</FootnoteText>
                              <FootnoteText className="text-text-tertiary">{toShortAddress(item.address)}</FootnoteText>
                            </div>
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
