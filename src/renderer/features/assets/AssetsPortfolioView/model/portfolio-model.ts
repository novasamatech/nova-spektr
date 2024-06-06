import { createEffect, createEvent, createStore, restore, sample } from 'effector';
import { once } from 'patronum';

import { Account, Balance, Chain, ChainId, AssetByChains, Wallet } from '@shared/core';
import { includes } from '@shared/lib/utils';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { AssetsListView } from '@entities/asset';
import { balanceModel } from '@entities/balance';
import { currencyModel, priceProviderModel } from '@entities/price';
import { tokensService } from '../lib/tokensService';

const activeViewChanged = createEvent<AssetsListView>();
const accountsChanged = createEvent<Account[]>();
const hideZeroBalancesChanged = createEvent<boolean>();
const queryChanged = createEvent<string>();
const transferStarted = createEvent<AssetByChains>();
const receiveStarted = createEvent<AssetByChains>();

const $hideZeroBalances = restore(hideZeroBalancesChanged, false);
const $accounts = restore<Account[]>(accountsChanged, []);
const $activeView = restore<AssetsListView | null>(activeViewChanged, null);
const $query = restore<string>(queryChanged, '');
const $tokens = createStore<AssetByChains[]>([]);
const $activeTokens = createStore<AssetByChains[]>([]);
const $filtredTokens = createStore<AssetByChains[]>([]);
const $sortedTokens = createStore<AssetByChains[]>([]);

type UpdateTokenParams = {
  activeWallet?: Wallet;
  chains: Record<ChainId, Chain>;
};

const getUpdatedTokensFx = createEffect(({ activeWallet, chains }: UpdateTokenParams): AssetByChains[] => {
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
  }, [] as AssetByChains[]);
});

type PopulateBalanceParams = {
  activeTokens: AssetByChains[];
  balances: Balance[];
  accounts: Account[];
  hideZeroBalances: boolean;
};

const populateTokensBalanceFx = createEffect(
  ({ activeTokens, balances, accounts, hideZeroBalances }: PopulateBalanceParams): AssetByChains[] => {
    return activeTokens.reduce<AssetByChains[]>((acc, token) => {
      const [chainsWithBalance, totalBalance] = tokensService.getChainWithBalance(
        balances,
        token.chains,
        hideZeroBalances,
        accounts,
      );

      if (chainsWithBalance.length > 0) {
        acc.push({ ...token, chains: chainsWithBalance, totalBalance });
      }

      return acc;
    }, []);
  },
);

sample({
  clock: [walletModel.$activeWallet, $activeView, once(networkModel.$chains)],
  source: {
    activeView: $activeView,
    activeWallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
  },
  filter: ({ activeView, activeWallet }) => {
    return Boolean(activeView === AssetsListView.TOKEN_CENTRIC && activeWallet);
  },
  target: getUpdatedTokensFx,
});

sample({
  clock: getUpdatedTokensFx.doneData,
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
  fn: ({ connections, chains, tokens, activeWallet }): AssetByChains[] => {
    const isMultisigWallet = walletUtils.isMultisig(activeWallet);

    return tokens.reduce<AssetByChains[]>((acc, token) => {
      const filteredChains = token.chains.filter((c) => {
        if (!connections[c.chainId]) return false;
        const isDisabled = networkUtils.isDisabledConnection(connections[c.chainId]);
        const hasMultiPallet = networkUtils.isMultisigSupported(chains[c.chainId].options);

        return !isDisabled && (!isMultisigWallet || hasMultiPallet);
      });

      if (filteredChains.length > 0) {
        acc.push({ ...token, chains: filteredChains });
      }

      return acc;
    }, []);
  },

  target: $activeTokens,
});

sample({
  clock: [balanceModel.$balances, networkModel.$connections, $accounts, $tokens, $hideZeroBalances],
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

sample({
  clock: queryChanged,
  source: $activeTokens,
  fn: (activeTokens, query) => {
    return activeTokens.reduce<AssetByChains[]>((acc, token) => {
      const filteredChains = token.chains.filter((chain) => {
        const hasSymbol = includes(chain.assetSymbol, query);
        const hasAssetName = includes(token.name, query);
        const hasChainName = includes(chain.name, query);

        return hasSymbol || hasAssetName || hasChainName;
      });

      if (filteredChains.length > 0) {
        acc.push({ ...token, chains: filteredChains });
      }

      return acc;
    }, []);
  },
  target: $filtredTokens,
});

sample({
  clock: [$activeTokens, $filtredTokens],
  source: {
    query: $query,
    activeTokens: $activeTokens,
    filtredTokens: $filtredTokens,
    assetsPrices: priceProviderModel.$assetsPrices,
    fiatFlag: priceProviderModel.$fiatFlag,
    currency: currencyModel.$activeCurrency,
  },
  fn: ({ query, activeTokens, filtredTokens, assetsPrices, fiatFlag, currency }) => {
    const tokenList = query ? filtredTokens : activeTokens;

    return tokensService.sortTokensByBalance(tokenList, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined);
  },
  target: $sortedTokens,
});

export const portfolioModel = {
  $activeView,
  $accounts,
  $sortedTokens,
  events: {
    activeViewChanged,
    accountsChanged,
    hideZeroBalancesChanged,
    queryChanged,
    transferStarted,
    receiveStarted,
  },
  /* Internal API (tests only) */
  _$activeTokens: $activeTokens,
  _$filtredTokens: $filtredTokens,
  _$query: $query,
};
