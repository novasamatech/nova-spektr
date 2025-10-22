import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { chainsService } from '@/shared/api/network';
import { type Asset, type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { includesMultiple, nullable } from '@/shared/lib/utils';
import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { AssetsListView, EmptyAssetsState } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

import { NetworkAssets } from './NetworkAssets/NetworkAssets';

type Props = {
  query: string;
  selectedAccounts: AnyAccount[];
  hideZeroBalances: boolean;
  assetsView: AssetsListView;
};
export const AssetsChainView = ({ query, selectedAccounts, hideZeroBalances, assetsView }: Props) => {
  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const balances = useUnit(balanceModel.$balanceMap);

  const assetsPrices = useUnit(priceProviderModel.$assetsPrices);
  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);
  const currency = useUnit(currencyModel.$activeCurrency);
  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);

  const [sortedChains, setSortedChains] = useState<Chain[]>([]);
  const [filteredChains, setFilteredChains] = useState<Chain[]>([]);

  const { list, isLoading } = useDeferredList({ list: filteredChains, forceFirstRender: true });

  useEffect(() => {
    if (!activeWallet || assetsView !== AssetsListView.CHAIN_CENTRIC || !selectedAccounts.length) return;

    const isMultisig = walletUtils.isMultisig(activeWallet);

    const filteredChains = [];
    for (const chain of Object.values(chains)) {
      const connection = connections[chain.chainId];

      if (nullable(connection)) continue;
      if (networkUtils.isDisabledConnection(connection)) continue;

      for (const account of activeWallet.accounts) {
        if (
          !selectedAccounts.find((a) => a.accountId === account.accountId) ||
          !accountUtils.isNonBaseVaultAccount(account, activeWallet) ||
          !accountUtils.isChainAndCryptoMatch(account, chain)
        )
          continue;

        if (!isMultisig || networkUtils.isMultisigSupported(chain.options)) {
          filteredChains.push(chain);
          break;
        }
      }
    }

    const sortedChains = chainsService.sortChainsByBalance(
      filteredChains,
      balances,
      assetsPrices,
      fiatFlag ? currency?.coingeckoId : undefined,
    );

    setSortedChains(sortedChains);
  }, [activeWallet, balances, assetsPrices, assetsView, connections, selectedAccounts]);

  useEffect(() => {
    let filteredChains: Chain[] = [];
    const fullChainMatch: number[] = [];

    for (const chain of sortedChains) {
      // Case 1: full match for chain.name  -> get only that chain
      if (query.toLowerCase() === chain.name.toLowerCase()) {
        filteredChains = [chain];
        break;
      }

      let filteredAssets: Asset[] = [];
      for (const asset of chain.assets) {
        // Case 2: full match for asset symbol -> get only that asset
        if (query.toLowerCase() === asset.symbol.toLowerCase()) {
          fullChainMatch.push(filteredChains.length);
          filteredAssets = [asset];
          break;
        }
        // Case 3: partial match for asset symbol
        if (includesMultiple([chain.name, asset.name], query)) {
          filteredAssets.push(asset);
        }
      }

      if (filteredAssets.length === 0) continue;

      filteredChains.push({ ...chain, assets: filteredAssets });
    }

    if (fullChainMatch.length === 0) {
      setFilteredChains(filteredChains);
    } else {
      setFilteredChains(filteredChains.filter((_, index) => fullChainMatch.includes(index)));
    }
  }, [sortedChains, query]);

  if (assetsView !== AssetsListView.CHAIN_CENTRIC || !selectedAccounts.length) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-y-4 overflow-y-scroll">
      <div className="flex min-h-full w-full flex-col items-center gap-y-4 py-4">
        {isLoading && (
          <Box fillContainer verticalAlign="center" horizontalAlign="center">
            <Loader color="primary" size={32} />
          </Box>
        )}

        {list.map((chain) => (
          <NetworkAssets
            key={chain.chainId}
            chain={chain}
            accounts={selectedAccounts}
            hideZeroBalances={hideZeroBalances}
            query={query}
            wallet={activeWallet}
          />
        ))}
        <EmptyAssetsState />
      </div>
    </div>
  );
};
