import { createEffect, createEvent, createStore, sample } from 'effector';
import { once } from 'patronum';

import { Account, AccountId, Balance, Chain, ChainId, TokenAsset, TokenBalance, Wallet } from '@shared/core';
import { ZERO_BALANCE, totalAmount } from '@shared/lib/utils';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { AssetsListView } from '@entities/asset';
import { balanceModel, balanceUtils } from '@entities/balance';
import { sumTokenBalances, tokensService } from '../lib/tokensService';
import { AssetChain } from '../lib/types';

const activeViewSet = createEvent<AssetsListView>();
const accountsSet = createEvent<Account[]>();
const hideZeroBalancesSet = createEvent<boolean>();

const $activeView = createStore<AssetsListView | null>(null);
const $accounts = createStore<Account[]>([]);
const $hideZeroBalances = createStore<boolean>(false);
const $tokens = createStore<TokenAsset[]>([]);
const $activeTokens = createStore<TokenAsset[]>([]);

const updateTokensFx = createEffect(
  ({ activeWallet, chains }: { activeWallet?: Wallet; chains: Record<ChainId, Chain> }): TokenAsset[] => {
    const tokens = tokensService.getTokensData();

    return tokens.reduce((acc, token) => {
      const filteredChains = token.chains.filter((chain) => {
        return activeWallet?.accounts.some((account) => {
          return (
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

const populateTokensBalanceFx = createEffect(
  ({
    activeTokens,
    balances,
    accounts,
    hideZeroBalances,
  }: {
    activeTokens: TokenAsset[];
    balances: Balance[];
    accounts: Account[];
    hideZeroBalances: boolean;
  }): TokenAsset[] => {
    return activeTokens.reduce((acc, token) => {
      let totalBalance = {} as TokenBalance;
      const chainWithBalance = token.chains.reduce((acc, chain) => {
        const selectedAccountIds = accounts.reduce<AccountId[]>((acc, account) => {
          if (accountUtils.isChainIdMatch(account, chain.chainId)) {
            acc.push(account.accountId);
          }

          return acc;
        }, []);

        const accountsBalance = balanceUtils.getAssetBalances(
          balances,
          selectedAccountIds,
          chain.chainId,
          chain.assetId.toString(),
        );

        const assetBalance = accountsBalance.reduce<TokenBalance>((acc, balance) => {
          return sumTokenBalances(balance, acc);
        }, {} as Balance);

        totalBalance = sumTokenBalances(assetBalance, totalBalance);

        if (!hideZeroBalances || assetBalance.verified === false || totalAmount(assetBalance) !== ZERO_BALANCE) {
          acc.push({ ...chain, balance: assetBalance });
        }

        return acc;
      }, [] as AssetChain[]);

      if (chainWithBalance.length > 0) {
        acc.push({ ...token, chains: chainWithBalance, totalBalance });
      }

      return acc;
    }, [] as TokenAsset[]);
  },
);

sample({
  clock: activeViewSet,
  target: $activeView,
});

sample({
  clock: accountsSet,
  target: $accounts,
});
sample({
  clock: hideZeroBalancesSet,
  target: $hideZeroBalances,
});

sample({
  clock: [walletModel.$activeWallet, $activeView, once(networkModel.events.networkStarted)],
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
  clock: [networkModel.$connections, $tokens, $hideZeroBalances],
  source: {
    activeView: $activeView,
    activeWallet: walletModel.$activeWallet,
    connections: networkModel.$connections,
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

sample({
  clock: [balanceModel.$balances, $accounts, $tokens, $hideZeroBalances],
  source: {
    activeView: $activeView,
    activeTokens: $activeTokens,
    accounts: $accounts,
    balances: balanceModel.$balances,
    hideZeroBalances: $hideZeroBalances,
  },
  filter: ({ activeView, balances }) => {
    return Boolean(activeView === AssetsListView.TOKEN_CENTRIC && balances.length > 0);
  },
  target: populateTokensBalanceFx,
});

sample({
  clock: populateTokensBalanceFx.doneData,
  target: $activeTokens,
});

export const portfolioModel = {
  $activeTokens,
  events: {
    activeViewSet,
    accountsSet,
    hideZeroBalancesSet,
  },
};
