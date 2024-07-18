import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { chainsService } from '@shared/api/network';
import { type Account, type Chain } from '@shared/core';
import { isStringsMatchQuery } from '@shared/lib/utils';
import { AssetsListView, EmptyAssetsState } from '@entities/asset';
import { balanceModel } from '@entities/balance';
import { networkModel, networkUtils } from '@entities/network';
import { currencyModel, priceProviderModel } from '@entities/price';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';

import { NetworkAssets } from './NetworkAssets/NetworkAssets';

type Props = {
  query: string;
  activeShards: Account[];
  hideZeroBalances: boolean;
  assetsView: AssetsListView;
};
export const AssetsChainView = ({ query, activeShards, hideZeroBalances, assetsView }: Props) => {
  const activeWallet = useUnit(walletModel.$activeWallet);
  const balances = useUnit(balanceModel.$balances);

  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);

  const [sortedChains, setSortedChains] = useState<Chain[]>([]);

  useEffect(() => {
    if (!activeWallet || assetsView !== AssetsListView.CHAIN_CENTRIC || !activeShards.length) return;

    const isMultisig = walletUtils.isMultisig(activeWallet);

    const availableChains = Object.values(chains).filter((chain) => {
      return activeWallet.accounts.some((account) => {
        return (
          activeWallet &&
          accountUtils.isNonBaseVaultAccount(account, activeWallet) &&
          accountUtils.isChainAndCryptoMatch(account, chain)
        );
      });
    });

    const filteredChains = availableChains.filter((c) => {
      if (!connections[c.chainId]) {
        return false;
      }

      const isDisabled = networkUtils.isDisabledConnection(connections[c.chainId]);
      const hasMultiPallet = !isMultisig || networkUtils.isMultisigSupported(c.options);

      return !isDisabled && hasMultiPallet;
    });

    const sortedChains = chainsService.sortChainsByBalance(
      filteredChains,
      balances,
      assetsPrices,
      fiatFlag ? currency?.coingeckoId : undefined,
    );

    setSortedChains(sortedChains);
  }, [activeWallet, balances, assetsPrices, assetsView, activeShards]);

  if (assetsView !== AssetsListView.CHAIN_CENTRIC || !activeShards.length) {
    return null;
  }

  const searchSymbolOnly = sortedChains.some((chain) => {
    return chain.assets.some((asset) => isStringsMatchQuery(query, [asset.symbol, asset.name]));
  });

  return (
    <div className="flex flex-col gap-y-4 w-full h-full overflow-y-scroll">
      <ul className="flex flex-col gap-y-4 items-center w-full py-4">
        {sortedChains.map((chain) => (
          <NetworkAssets
            key={chain.chainId}
            searchSymbolOnly={searchSymbolOnly}
            chain={chain}
            accounts={activeShards}
            hideZeroBalances={hideZeroBalances}
            query={query}
          />
        ))}
        <EmptyAssetsState />
      </ul>
    </div>
  );
};
