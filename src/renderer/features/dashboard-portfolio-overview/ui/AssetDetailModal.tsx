import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { NamedAccount } from '@/widgets/NameResolver';
import { type BreakdownRow, useHoldingBreakdown } from '../hooks/useHoldingBreakdown';
import { type Holding } from '../hooks/useHoldings';
import { type BalanceType } from '../lib/balanceTypes';
import { type RowAllocation, computeAssetRowAllocations } from '../lib/computeRowAllocations';

import { AllocationBarWithLegend } from './AllocationBarWithLegend';
import { BalanceTypeBadge } from './BalanceTypeBadge';
import { Price } from './Price';
import { PriceChangeIndicator } from './PriceChangeIndicator';

type AssetTableRow = BreakdownRow & { allocation: RowAllocation | null };

type EntryLike = { accountId: string; name: string; address: string };

type Props = {
  holding: Holding;
  accountIds: string[];
  allEntries: EntryLike[];
  balanceType: BalanceType | null;
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const AssetDetailModal = memo(({ holding, accountIds, allEntries, balanceType, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useHoldingBreakdown(holding.priceId, accountIds, allEntries, balanceType);
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
          <NamedAccount
            accountId={pjsSchema.helpers.toAccountId(item.accountId)}
            chain={undefined}
            title={item.name || undefined}
            titleClass="truncate font-semibold"
            variant="short"
            iconSize={24}
            hideExplorers
          />
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
            <div className="flex items-center gap-1.5">
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.portfolioOverview.assetDetail.addressCount', { count: addressCount })}
              </FootnoteText>
              {balanceType && <BalanceTypeBadge type={balanceType} />}
            </div>
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
