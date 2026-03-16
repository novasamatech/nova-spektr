import { BN_ZERO } from '@polkadot/util';
import BigNumber from 'bignumber.js';
import { useUnit } from 'effector-react';
import { memo, useMemo, useState } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import {
  formatFiatBalance,
  getRoundedValue,
  performSearch,
  totalAmount,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { BodyText, EmptyListWithIcon, FootnoteText } from '@/shared/ui';
import { AssetBalance, AssetIcon, ChainIcon } from '@/shared/ui-entities';
import { Modal, ScrollArea, SearchInput } from '@/shared/ui-kit';
import { currencyModel, priceProviderModel } from '@/domains/price';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { AssetFiatBalance, FiatBalance, TokenPrice } from '@/widgets/price';
import { formModel } from '../model/form-model';

type Props = {
  isOpen: boolean;
  chain: Chain;
  onSelect: (asset: Asset) => void;
  onClose: () => void;
};

export const TokenSelectorModal = memo(({ isOpen, chain, onSelect, onClose }: Props) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const initiator = useUnit(formModel.form.fields.initiator.$value);
  const balances = useUnit(balanceModel.$balanceMap);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const prices = useUnit(priceProviderModel.$assetsPrices);
  const currency = useUnit(currencyModel.$activeCurrency);

  const assetsWithBalances = useMemo(() => {
    return chain.assets
      .map((asset) => {
        const balance = initiator
          ? balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId)
          : null;
        const transferable = balance ? withdrawableAmountBN(balance) : null;

        return {
          asset,
          transferable,
        };
      })
      .filter(({ transferable }) => transferable && transferable.gt(BN_ZERO))
      .sort((a, b) => {
        const aBalance = a.transferable ?? BN_ZERO;
        const bBalance = b.transferable ?? BN_ZERO;

        return bBalance.cmp(aBalance);
      });
  }, [chain.assets, initiator, balances, chain.chainId]);

  const filteredAssets = useMemo(() => {
    if (!query) return assetsWithBalances;

    return performSearch({
      query,
      records: assetsWithBalances.map((item) => ({
        ...item,
        name: item.asset.name,
        symbol: item.asset.symbol,
      })),
      weights: { name: 1, symbol: 1 },
    });
  }, [query, assetsWithBalances]);

  const totalFiatBalance = useMemo(() => {
    if (!initiator || !prices || !currency?.coingeckoId) return null;

    return chain.assets.reduce<BigNumber>((acc, asset) => {
      if (!asset.priceId || !prices[asset.priceId]) return acc;

      const price = prices[asset.priceId]?.[currency.coingeckoId];
      const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);

      if (price && balance) {
        const fiatBalance = getRoundedValue(totalAmount(balance), price.price, asset.precision);
        return acc.plus(fiatBalance);
      }

      return acc;
    }, new BigNumber(0));
  }, [chain.assets, initiator, balances, chain.chainId, prices, currency]);

  const handleSelect = (asset: Asset) => {
    onSelect(asset);
    setQuery('');
  };

  return (
    <Modal size="md" height="full" isOpen={isOpen} onToggle={onClose}>
      <Modal.Title close>{t('transfer.tokenSelector.title')}</Modal.Title>
      <Modal.Content>
        <div className="flex h-full flex-col gap-4">
          <div className="flex flex-col gap-4 px-5">
            <SearchInput
              value={query}
              placeholder={t('transfer.tokenSelector.searchPlaceholder')}
              onChange={setQuery}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChainIcon chain={chain} size={20} />
                <FootnoteText className="text-text-secondary">{chain.name}</FootnoteText>
              </div>
              {fiatFlag && totalFiatBalance && (
                <FiatBalance amount={formatFiatBalance(totalFiatBalance.toString()).value} />
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea>
              <ul className="flex flex-col">
                {filteredAssets.map(({ asset, transferable }) => (
                  <li key={asset.assetId}>
                    <button
                      type="button"
                      className="flex w-full cursor-pointer items-center gap-3 px-5 py-1 transition-colors hover:bg-action-background-hover"
                      onClick={() => handleSelect(asset)}
                    >
                      <AssetIcon asset={asset} size={36} />
                      <div className="flex flex-1 flex-col items-start gap-0.5">
                        <BodyText>{asset.symbol}</BodyText>
                        <TokenPrice
                          assetId={asset.priceId}
                          wrapperClassName="flex items-center gap-1"
                          className="text-text-tertiary"
                        />
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <AssetBalance value={transferable?.toString() ?? '0'} asset={asset} showSymbol={false} />
                        {fiatFlag && (
                          <AssetFiatBalance
                            asset={asset}
                            amount={transferable?.toString() ?? '0'}
                            className="text-text-tertiary"
                          />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
                {filteredAssets.length === 0 && (
                  <li>
                    {query ? (
                      <EmptyListWithIcon
                        title={t('transfer.tokenSelector.noSearchResults')}
                        message={t('transfer.tokenSelector.noSearchResultsDescription')}
                      />
                    ) : (
                      <EmptyListWithIcon
                        title={t('transfer.tokenSelector.noTokens')}
                        message={t('transfer.tokenSelector.noTokensDescription')}
                      />
                    )}
                  </li>
                )}
              </ul>
            </ScrollArea>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
});
