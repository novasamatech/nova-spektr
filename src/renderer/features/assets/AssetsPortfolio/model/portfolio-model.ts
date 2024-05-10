import { createEffect, createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { Chain, ChainId, TokenAsset, Wallet } from '@shared/core';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { tokensService } from '../lib/tokensService';
import { AssetsListView } from '@/src/renderer/entities/asset';

const setActiveView = createEvent<AssetsListView>();

const $activeView = createStore<AssetsListView>(AssetsListView.TOKEN_CENTRIC);
const $tokens = createStore<TokenAsset[]>([]);
const $activeTokens = createStore<TokenAsset[]>([]);

const updateTokensFx = createEffect(
  ({ activeWallet, chains }: { activeWallet?: Wallet; chains: Record<ChainId, Chain> }): TokenAsset[] => {
    const tokens = tokensService.getTokensData();

    return tokens.reduce((acc, token) => {
      const filteredChains = token.chains.filter((chain) => {
        return activeWallet?.accounts.some((account) => {
          return (
            activeWallet &&
            accountUtils.isNonBaseVaultAccount(account, activeWallet) &&
            accountUtils.isChainAndCryptoMatch(account, chains[chain.chainId])
          );
        });
      });

      if (filteredChains.length > 0) {
        acc.push({ ...token, chains: filteredChains });
      }

      return acc;
    }, [] as TokenAsset[]);
  },
);

sample({
  clock: setActiveView,
  target: $activeView,
});

sample({
  clock: [walletModel.$activeWallet, once(networkModel.events.networkStarted)],
  source: {
    activeView: $activeView,
    activeWallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
  },
  filter: ({ activeView, activeWallet }) => {
    return Boolean(activeView === AssetsListView.TOKEN_CENTRIC && activeWallet);
  },
  target: updateTokensFx,
});

sample({
  clock: updateTokensFx.doneData,
  target: $tokens,
});

sample({
  clock: [networkModel.$connections, $tokens],
  source: {
    activeView: $activeView,
    connections: networkModel.$connections,
    activeWallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
    tokens: $tokens,
  },
  filter: ({ connections, activeWallet, activeView }) => {
    return Boolean(activeView === AssetsListView.TOKEN_CENTRIC && Object.keys(connections).length && activeWallet);
  },
  fn: ({ connections, chains, tokens, activeWallet }): TokenAsset[] => {
    const isMultisig = walletUtils.isMultisig(activeWallet);

    return tokens.reduce((acc, token) => {
      const filteredChains = token.chains.filter((c) => {
        if (!connections[c.chainId]) return false;
        const isDisabled = networkUtils.isDisabledConnection(connections[c.chainId]);
        const hasMultiPallet = !isMultisig || networkUtils.isMultisigSupported(chains[c.chainId].options);

        return !isDisabled && hasMultiPallet;
      });

      if (filteredChains.length > 0) {
        acc.push({ ...token, chains: filteredChains });
      }

      return acc;
    }, [] as TokenAsset[]);
  },

  target: $activeTokens,
});

export const portfolioModel = {
  $activeTokens,
  $activeView,
  events: {
    setActiveView,
  },
};
