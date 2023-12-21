import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { isMultisigAvailable, networkModel, chainsService } from '@entities/network';
import type { Chain } from '@shared/core';
import { ConnectionType } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { priceProviderModel, currencyModel } from '@entities/price';
import { includes } from '@shared/lib/utils';
import { Icon, BodyText } from '@shared/ui';
import { NetworkAssets } from '../NetworkAssets/NetworkAssets';
import { assetsModel } from '../../model/assets-model';
import { balanceModel } from '@entities/balance';

export const AssetsList = () => {
  const { t } = useI18n();

  const query = useUnit(assetsModel.$query);
  const activeShards = useUnit(assetsModel.$activeShards);

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

    const filteredChains = Object.values(chains).filter((c) => {
      const isDisabled = connections[c.chainId]?.connectionType === ConnectionType.DISABLED;
      const hasMultiPallet = !isMultisig || isMultisigAvailable(c.options);

      return !isDisabled && hasMultiPallet;
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
