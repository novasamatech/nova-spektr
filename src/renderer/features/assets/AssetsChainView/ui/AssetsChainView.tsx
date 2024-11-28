import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { chainsService } from '@/shared/api/network';
import { type Account, type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { isStringsMatchQuery, nullable } from '@/shared/lib/utils';
import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { AssetsListView, EmptyAssetsState } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';

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

  const { list, isLoading } = useDeferredList({ list: sortedChains, forceFirstRender: true });

  useEffect(() => {
    if (!activeWallet || assetsView !== AssetsListView.CHAIN_CENTRIC || !activeShards.length) return;

    const isMultisig = walletUtils.isMultisig(activeWallet);
    const multisigChainToInclude = isMultisig ? activeWallet.accounts[0].chainId : undefined;

    const availableChains = Object.values(chains).filter((chain) => {
      return activeWallet.accounts.some((account) => {
        return (
          accountUtils.isNonBaseVaultAccount(account, activeWallet) &&
          accountUtils.isChainAndCryptoMatch(account, chain)
        );
      });
    });

    const filteredChains = availableChains.filter((c) => {
      const connection = connections[c.chainId];

      if (nullable(connection)) return false;
      if (networkUtils.isDisabledConnection(connection)) return false;
      if (!isMultisig) return true;

      return networkUtils.isMultisigSupported(c.options) || multisigChainToInclude === c.chainId;
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

  const searchSymbolOnly = list.some((chain) => {
    return chain.assets.some((asset) => isStringsMatchQuery(query, [asset.symbol, asset.name]));
  });

  return (
    <div className="flex h-full w-full flex-col gap-y-4 overflow-y-scroll">
      <ul className="flex min-h-full w-full flex-col items-center gap-y-4 py-4">
        {isLoading && (
          <Box fillContainer verticalAlign="center" horizontalAlign="center">
            <Loader color="primary" size={32} />
          </Box>
        )}

        {list.map((chain) => (
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
