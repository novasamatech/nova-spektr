import { combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ConnectionStatus } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { networkModel, networkUtils } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';

const selectNetwork = createEvent<Chain>();
const resetNetwork = createEvent();

const $governanceChain = restore(selectNetwork, null);

const $governanceChains = combine(networkModel.$chains, (chains) => {
  return Object.values(chains).filter((chain) => networkUtils.isGovernanceSupported(chain.options));
});

const $governanceChainApi = combine(
  {
    chain: $governanceChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    return chain ? (apis[chain.chainId] ?? null) : null;
  },
);

const $network = combine($governanceChain, $governanceChainApi, (chain, api) => {
  if (!chain) return null;
  if (!api) return null;

  const asset = chain.assets.at(0);
  if (!asset) return null;

  return {
    chain,
    asset,
    api,
  };
});

const $isApiConnected = $network.map((network) => network?.api.isConnected ?? false);

sample({
  clock: resetNetwork,
  source: {
    chain: $governanceChain,
    chains: $governanceChains,
  },
  filter: ({ chain, chains }) => !chain && chains.length > 0,
  fn: ({ chains }) => chains.at(0) ?? null,
  target: $governanceChain,
});

const $isConnectionActive = combine(
  {
    chain: $governanceChain,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chain, statuses }) => {
    if (!chain) {
      return false;
    }

    const status: ConnectionStatus | void = statuses[chain.chainId];
    if (!status) {
      return false;
    }

    return networkUtils.isConnectingStatus(status) || networkUtils.isConnectedStatus(status);
  },
);

const $hasAccount = combine(
  {
    chain: $governanceChain,
    activeWallet: walletModel.$activeWallet,
  },
  ({ chain, activeWallet }) => {
    if (!activeWallet || !chain) return false;

    return activeWallet.accounts.some((account) => {
      return (
        accountUtils.isNonBaseVaultAccount(account, activeWallet) && accountUtils.isChainAndCryptoMatch(account, chain)
      );
    });
  },
);

const networkSelected = $network.updates.filter({ fn: nonNullable });

export const networkSelectorModel = {
  $isConnectionActive,
  $governanceChain,
  $governanceChains,
  $governanceChainApi,
  $network,
  $hasAccount,
  $isApiConnected,

  events: {
    resetNetwork,
    selectNetwork,
    networkSelected,
  },
};
