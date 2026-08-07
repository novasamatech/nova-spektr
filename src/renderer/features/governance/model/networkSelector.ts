import { combine, createEvent, restore, sample } from 'effector';

import { type ChainId, type ConnectionStatus } from '@/shared/core';
import { getNativeAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { accountService } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';

const selectNetwork = createEvent<ChainId>();
const resetNetwork = createEvent();

const $governanceChainId = restore(selectNetwork, null);

const $governanceChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => networkUtils.isGovernanceSupported(chain.options));
});

const $governanceChain = combine(
  {
    chainId: $governanceChainId,
    chains: $governanceChains,
  },
  ({ chainId, chains }) => {
    return chains.find((chain) => chain.chainId === chainId) ?? null;
  },
);

const $nativeAsset = combine($governanceChain, (chain) => (chain?.assets ? getNativeAsset(chain.assets) : null));

const $governanceChainApi = combine(
  {
    chainId: $governanceChainId,
    apis: networkModel.$apis,
  },
  ({ chainId, apis }) => {
    return chainId ? (apis[chainId] ?? null) : null;
  },
);

const $timelineChainApi = combine(
  {
    chain: $governanceChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    if (nullable(chain)) {
      return null;
    }
    const timelineChainId = chain.additional?.timelineChain;
    return (timelineChainId && apis[timelineChainId]) ?? apis[chain.chainId] ?? null;
  },
);

const $network = combine(
  {
    chain: $governanceChain,
    api: $governanceChainApi,
    timelineApi: $timelineChainApi,
  },
  ({ chain, api, timelineApi }) => {
    if (nullable(chain) || nullable(api) || nullable(timelineApi)) return null;

    const asset = chain.assets.at(0);
    if (!asset) return null;

    return { api, timelineApi, chain, asset };
  },
);

const $isApiConnected = $network.map(
  (network) => (network?.api.isConnected && network?.timelineApi?.isConnected) ?? false,
);

sample({
  clock: resetNetwork,
  source: {
    chainId: $governanceChainId,
    chains: $governanceChains,
  },
  filter: ({ chainId, chains }) => nonNullable(chainId) && chains.length > 0,
  fn: ({ chains }) => chains.at(0)?.chainId ?? null,
  target: $governanceChainId,
});

const $isConnectionActive = combine(
  {
    chainId: $governanceChainId,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    if (!chainId) return false;

    const status: ConnectionStatus | void = statuses[chainId];
    if (!status) {
      return false;
    }

    return networkUtils.isConnectingStatus(status) || networkUtils.isConnectedStatus(status);
  },
);

const $hasAccount = combine(
  {
    chain: $governanceChain,
    activeWallet: walletSelect.$selectedWallet,
  },
  ({ chain, activeWallet }) => {
    if (!activeWallet || !chain) return false;

    return activeWallet.accounts.some((account) => {
      const isNonBase = accountUtils.isNonBaseVaultAccount(account, activeWallet);
      const isChainMatch = accountService.isAccountAvailableOnChain(account, chain);

      return isNonBase && isChainMatch;
    });
  },
);

const networkSelected = $network.updates.filter({ fn: nonNullable });

export const networkSelectorModel = {
  $governanceChainId,
  $governanceChain,
  $governanceChains,
  $governanceChainApi,
  $timelineChainApi,
  $nativeAsset,

  $network,
  $hasAccount,
  $isApiConnected,
  $isConnectionActive,

  events: {
    resetNetwork,
    selectNetwork,
    networkSelected,
  },
};
