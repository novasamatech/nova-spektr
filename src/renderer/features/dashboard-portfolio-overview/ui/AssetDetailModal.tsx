import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance, toAddress, toShortAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetIcon, Identicon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type BreakdownRow, useHoldingBreakdown } from '../hooks/useHoldingBreakdown';
import { type Holding } from '../hooks/useHoldings';
import { type RowAllocation, computeAssetRowAllocations } from '../lib/computeRowAllocations';

import { AllocationBarWithLegend } from './AllocationBarWithLegend';
import { Price } from './Price';
import { PriceChangeIndicator } from './PriceChangeIndicator';

type AssetTableRow = BreakdownRow & { allocation: RowAllocation | null };

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

  const balanceMap = useUnit(balanceModel.$balanceMap);
  const chains = useUnit(networkModel.$chains);
  const activeCurrency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: prices } = useAssetsPrices(pricesParams);

  const allocations = useMemo(() => {
    if (!prices || !activeCurrency) return new Map<string, RowAllocation>();

    return computeAssetRowAllocations({
      accountIds: rows.map((r) => r.accountId),
      priceId: holding.priceId,
      balanceMap,
      chains,
      prices,
      currency: activeCurrency,
    });
  }, [rows, holding.priceId, balanceMap, chains, prices, activeCurrency]);

  const tableData = useMemo<AssetTableRow[]>(
    () => rows.map((row) => ({ ...row, allocation: allocations.get(row.accountId) ?? null })),
    [rows, allocations],
  );

  const columns = useMemo<Column<AssetTableRow>[]>(
    () => [
      {
        key: 'name',
        title: t('dashboard.portfolioOverview.assetDetail.address'),
        width: '28%',
        render: (_, item) => (
          <div className="flex items-center gap-2">
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
        title: t('dashboard.portfolioOverview.assetDetail.holdings'),
        sortable: true,
        width: '24%',
        render: (_, item) => {
          const bal = formatBalance(item.rawAmount, item.precision);

          return (
            <div>
              <FootnoteText className="font-semibold tabular-nums">
                {bal.formatted}
                {bal.suffix} {item.symbol}
              </FootnoteText>
              <HelpText className="text-text-tertiary tabular-nums">
                <Price amount={item.fiatValue} currency={currency} /> · {item.sharePercent.toFixed(1)}%
              </HelpText>
            </div>
          );
        },
      },
      {
        key: 'allocation',
        title: t('dashboard.portfolioOverview.assetAllocation'),
        width: '48%',
        render: (_, item) =>
          item.allocation ? (
            <AllocationBarWithLegend
              allocation={item.allocation}
              symbol={item.symbol}
              precision={item.precision}
              currency={currency}
            />
          ) : null,
      },
    ],
    [t, currency],
  );

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

        <div className="overflow-y-auto px-5 pb-4" style={{ maxHeight: 440 }}>
          <Table columns={columns} data={tableData} />
        </div>
      </Modal.Content>
    </Modal>
  );
});
