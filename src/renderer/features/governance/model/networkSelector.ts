import { combine, createEvent, restore, sample } from 'effector';

import { type Chain, type ConnectionStatus } from '@shared/core';
import { accountUtils, walletModel } from '@/entities/wallet';
import { networkModel, networkUtils } from '@entities/network';

const chainChanged = createEvent<Chain>();
const defaultChainSet = createEvent();

const $governanceChain = restore(chainChanged, null);

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

const $governanceNetwork = combine(
  {
    chain: $governanceChain,
    apis: networkModel.$apis,
  },
  ({ chain, apis }) => {
    if (!chain) return null;

    const api = apis[chain.chainId];
    if (!api) return null;

    return {
      chain,
      api: apis[chain.chainId],
    };
  },
);

const $isApiConnected = $governanceChainApi.map((x) => x?.isConnected ?? false);

sample({
  clock: defaultChainSet,
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

export const networkSelectorModel = {
  $isConnectionActive,
  $governanceChain,
  $governanceChains,
  $governanceChainApi,
  $governanceNetwork,
  $hasAccount,
  $isApiConnected,

  input: {
    defaultChainSet,
  },
  events: {
    chainChanged,
  },
};
