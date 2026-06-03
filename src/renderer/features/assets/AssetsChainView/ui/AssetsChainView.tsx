import { useUnit } from 'effector-react';
import { useEffect, useMemo, useState } from 'react';

import { chainsService } from '@/shared/api/network';
import { type Asset, type Chain } from '@/shared/core';
import { useDeferredList } from '@/shared/lib/hooks';
import { includesMultiple, nullable } from '@/shared/lib/utils';
import { Loader } from '@/shared/ui';
import { Box } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { useAssetsPrices } from '@/domains/price';
import { EmptyAssetsState } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { currencySelect } from '@/aggregates/currency-select';
import { walletSelect } from '@/aggregates/wallet-select';

import { NetworkAssets } from './NetworkAssets/NetworkAssets';

type Props = {
  query: string;
  visibleAccounts: AnyAccount[];
  hideZeroBalances: boolean;
};
export const AssetsChainView = ({ query, visibleAccounts, hideZeroBalances }: Props) => {
  const activeWallet = useUnit(walletSelect.$selectedWallet);
  const wallets = useUnit(walletModel.$wallets);
  const isLoadingWallets = useUnit(walletModel.$isLoadingWallets);
  const activeWalletAccounts = useUnit(walletSelect.$selectedAccounts);
  const accountsPopulated = useUnit(accounts.$populated);
  const accountAvailabilityRevision = useUnit(accountService.$accountAvailabilityRevision);
  const balances = useUnit(balanceModel.$balanceMap);
  const balancesPopulated = useUnit(balanceModel.$populated);

  const fiatFlag = useUnit(currencySelect.$fiatFlag);
  const currency = useUnit(currencySelect.$activeCurrency);
  const pricesParams = useUnit(currencySelect.$currentPricesParams);
  const { data: assetsPrices } = useAssetsPrices(pricesParams);
  const connections = useUnit(networkModel.$connections);
  const chains = useUnit(networkModel.$chains);

  const [sortedChains, setSortedChains] = useState<Chain[]>([]);
  const [filteredChains, setFilteredChains] = useState<Chain[]>([]);

  const visibleAccountIds = useMemo(() => new Set(visibleAccounts.map((a) => a.accountId)), [visibleAccounts]);
  const networkDataPopulated = Object.keys(chains).length > 0 && Object.keys(connections).length > 0;
  const visibleAccountsPopulated =
    accountsPopulated && !isLoadingWallets && (wallets.length === 0 || activeWallet !== null);
  const chainViewLoading = !balancesPopulated || !networkDataPopulated || !visibleAccountsPopulated;
  const emptyStateAvailable = Boolean(query) || hideZeroBalances;

  const { list, isLoading } = useDeferredList({
    list: filteredChains,
    isLoading: chainViewLoading,
    forceFirstRender: true,
  });
  const shouldShowLoader = isLoading && list.length === 0;
  const shouldShowEmptyState = emptyStateAvailable && list.length === 0 && !isLoading;

  useEffect(() => {
    if (!visibleAccounts.length) return;

    const filteredChains = Object.values(chains).filter((chain) => {
      const connection = connections[chain.chainId];

      if (nullable(connection) || networkUtils.isDisabledConnection(connection)) {
        return false;
      }

      return activeWalletAccounts.some((account) => {
        if (!visibleAccountIds.has(account.accountId)) return false;

        return accountService.isAccountAvailableOnChain(account, chain);
      });
    });

    const sortedChains = chainsService.sortChainsByBalance(
      filteredChains,
      balances,
      assetsPrices,
      fiatFlag ? currency?.coingeckoId : undefined,
    );

    setSortedChains(sortedChains);
  }, [
    activeWalletAccounts,
    balances,
    assetsPrices,
    chains,
    connections,
    currency,
    fiatFlag,
    visibleAccountIds,
    accountAvailabilityRevision,
  ]);

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

  if (!visibleAccounts.length && !chainViewLoading) {
    return null;
  }

  return (
    <div className="flex h-full w-full flex-col gap-y-4 overflow-y-scroll">
      <div className="flex min-h-full w-full flex-col items-center gap-y-4 py-4">
        {shouldShowLoader && (
          <Box fillContainer verticalAlign="center" horizontalAlign="center">
            <Loader color="primary" size={32} />
          </Box>
        )}

        {list.map((chain) => (
          <NetworkAssets
            key={chain.chainId}
            chain={chain}
            accounts={visibleAccounts}
            hideZeroBalances={hideZeroBalances}
            query={query}
            wallet={activeWallet}
          />
        ))}
        {shouldShowEmptyState && <EmptyAssetsState />}
      </div>
    </div>
  );
};
