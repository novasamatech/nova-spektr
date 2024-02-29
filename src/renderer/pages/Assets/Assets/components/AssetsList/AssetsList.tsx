import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { networkModel, networkUtils } from '@entities/network';
import type { Chain, ChainId } from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel, currencyModel } from '@entities/price';
import { includes } from '@shared/lib/utils';
import { Icon, BodyText } from '@shared/ui';
import { NetworkAssets } from '../NetworkAssets/NetworkAssets';
import { assetsModel } from '../../model/assets-model';
import { balanceModel } from '@entities/balance';
import { chainsService } from '@shared/api/network';

export const AssetsList = () => {
  const { t } = useI18n();

  const query = useUnit(assetsModel.$query);
  const activeShards = useUnit(assetsModel.$activeShards);
  const accounts = useUnit(assetsModel.$accounts);

  const activeWallet = useUnit(walletModel.$activeWallet);
  const balances = useUnit(balanceModel.$balances);

  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);

  const [sortedChains, setSortedChains] = useState<Chain[]>([]);

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    const isMultisig = walletUtils.isMultisig(activeWallet);

    const availableChains = accounts.some((a) => !accountUtils.isChainDependant(a))
      ? new Set(Object.keys(chains) as ChainId[])
      : // @ts-ignore
        new Set(accounts.filter((a) => Boolean(a.chainId)).map((a) => a.chainId));

    const filteredChains = Object.values(chains).filter((c) => {
      const isDisabled = networkUtils.isDisabledConnection(connections[c.chainId]);
      const hasMultiPallet = !isMultisig || networkUtils.isMultisigSupported(c.options);

      const hasChainAccount = availableChains.has(c.chainId);

      return !isDisabled && hasMultiPallet && hasChainAccount;
    });

    const sortedChains = chainsService.sortChainsByBalance(
      filteredChains,
      balances,
      assetsPrices,
      fiatFlag ? currency?.coingeckoId : undefined,
    );

    setSortedChains(sortedChains);
  }, [balances, assetsPrices]);

  const searchSymbolOnly = sortedChains.some((chain) => {
    return chain.assets.some((asset) => includes(asset.symbol, query));
  });

  return (
    <div className="flex flex-col gap-y-4 w-full h-full overflow-y-scroll">
      {activeShards.length > 0 && (
        <ul className="flex flex-col gap-y-4 items-center w-full py-4">
          {sortedChains.map((chain) => (
            <NetworkAssets
              key={chain.chainId}
              searchSymbolOnly={searchSymbolOnly}
              chain={chain}
              accounts={activeShards}
            />
          ))}

          <div className="hidden only:flex flex-col items-center justify-center gap-y-8 w-full h-full">
            <Icon as="img" name="emptyList" alt={t('balances.emptyStateLabel')} size={178} />
            <BodyText align="center" className="text-text-tertiary">
              {t('balances.emptyStateLabel')}
              <br />
              {t('balances.emptyStateDescription')}
            </BodyText>
          </div>
        </ul>
      )}
    </div>
  );
};
