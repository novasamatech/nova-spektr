import { useUnit } from 'effector-react';
import { memo, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { formatBalance } from '@/shared/lib/utils';
import { FootnoteText, HelpText } from '@/shared/ui';
import { AssetIcon } from '@/shared/ui-entities';
import { type Column, Modal, Table } from '@/shared/ui-kit';
import { type CurrencyItem, useAssetsPrices } from '@/domains/price';
import { balanceModel } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { currencySelect } from '@/aggregates/currency-select';
import { type ChainAssetRow, useChainBreakdown } from '../hooks/useChainBreakdown';
import { type ChainHolding } from '../hooks/useChainHoldings';
import { type BalanceType } from '../lib/balanceTypes';
import { type RowAllocation, computeChainRowAllocations } from '../lib/computeRowAllocations';

import { AllocationBarWithLegend } from './AllocationBarWithLegend';
import { BalanceTypeBadge } from './BalanceTypeBadge';
import { Price } from './Price';

type ChainTableRow = ChainAssetRow & { allocation: RowAllocation | null };

type Props = {
  chainHolding: ChainHolding;
  accountIds: string[];
  balanceType: BalanceType | null;
  currency: CurrencyItem | null;
  onClose: () => void;
};

export const ChainDetailModal = memo(({ chainHolding, accountIds, balanceType, currency, onClose }: Props) => {
  const { t } = useI18n();
  const { rows } = useChainBreakdown(chainHolding.chainId, accountIds, balanceType);

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
            <AssetIcon asset={item} size={24} />
            <FootnoteText className="truncate font-semibold">{item.symbol}</FootnoteText>
          </div>
        ),
      },
      {
        // cross-asset rows: raw plancks with different decimals aren't comparable, sort by fiat
        key: 'fiatValueNum',
        title: t('dashboard.portfolioOverview.chainDetail.holdings'),
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
      <Modal.Title close>
        {t('dashboard.portfolioOverview.chainDetail.title', { chainName: chainHolding.chainName })}
      </Modal.Title>
      <Modal.Content disableScroll>
        <div className="flex items-center gap-3 px-5 py-3">
          <img src={chainHolding.chainIcon} alt={chainHolding.chainName} width={32} height={32} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <FootnoteText className="font-bold">{chainHolding.chainName}</FootnoteText>
            <div className="flex items-center gap-1.5">
              <FootnoteText className="text-text-tertiary">
                {t('dashboard.portfolioOverview.chainDetail.assetCount', { count: chainHolding.assetCount })}
              </FootnoteText>
              {balanceType && <BalanceTypeBadge type={balanceType} />}
            </div>
          </div>
          <div className="shrink-0">
            <FootnoteText align="right" className="font-bold tabular-nums">
              <Price amount={chainHolding.fiatValue} currency={currency} />
            </FootnoteText>
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
