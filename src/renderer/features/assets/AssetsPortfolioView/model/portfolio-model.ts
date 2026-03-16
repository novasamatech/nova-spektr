import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { persist } from 'effector-storage/local';
import { once } from 'patronum';

import { type AssetByChains } from '@/shared/core';
import { includesMultiple, nonNullable, nullable } from '@/shared/lib/utils';
import { type AnyAccount, accountService } from '@/domains/network';
import { currencyModel, priceProviderModel } from '@/domains/price';
import { AssetsListView } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { walletSelect } from '@/aggregates/wallet-select';
import { shardsModel, shardsUtils } from '@/features/wallets';
import { tokensService } from '../lib/tokensService';

const DEFAULT_LIST: never[] = [];

const activeViewChanged = createEvent<AssetsListView>();
const hideZeroBalancesChanged = createEvent<boolean>();
const queryChanged = createEvent<string>();
const transferStarted = createEvent<AssetByChains>();
const receiveStarted = createEvent<AssetByChains>();

const $hideZeroBalances = restore(hideZeroBalancesChanged, false);
const $activeView = restore<AssetsListView>(activeViewChanged, AssetsListView.TOKEN_CENTRIC);
const $query = restore<string>(queryChanged, '');

const $defaultTokens = createStore<AssetByChains[] | null>(null);

const $filteredAccounts = createStore<AnyAccount[]>([]);

const populateFx = createEffect((): Promise<AssetByChains[] | null> => {
  return tokensService.getTokensData();
});

persist({
  key: 'assets_with_chains',
  store: $defaultTokens,
  sync: true,
});

sample({
  clock: populateFx.doneData,
  filter: (data) => nonNullable(data),
  target: $defaultTokens,
});

sample({
  clock: shardsModel.events.shardsConfirmed,
  source: {
    struct: shardsModel.$selectedStructure,
    selectedAccounts: walletSelect.$selectedAccounts,
  },
  fn: ({ struct, selectedAccounts }) => shardsUtils.getSelectedShards(struct, selectedAccounts),
  target: $filteredAccounts,
});

const $allInitiators = combine(
  {
    accounts: walletSelect.$selectedAccounts,
    chains: networkModel.$chains,
  },
  ({ accounts, chains }) => {
    if (nullable(accounts) || Object.keys(chains).length === 0) return [];
    const result = new Set<AnyAccount>();

    for (const chain of Object.values(chains)) {
      const initiators = accountService.findInitiators(accounts, chain);
      if (initiators.length > 0) {
        for (const account of initiators) {
          result.add(account);
        }
      }
    }

    return Array.from(result);
  },
);

sample({
  clock: $allInitiators,
  target: $filteredAccounts,
});

const $tokens = combine(
  {
    defaultTokens: $defaultTokens,
    activeView: $activeView,
    wallet: walletSelect.$selectedWallet,
    chains: networkModel.$chains,
    accounts: $allInitiators,
  },
  ({ defaultTokens, activeView, wallet, chains, accounts }) => {
    if (activeView !== AssetsListView.TOKEN_CENTRIC) return DEFAULT_LIST;
    if (nullable(wallet) || nullable(defaultTokens)) return DEFAULT_LIST;

    const tokens: AssetByChains[] = [];

    for (const token of defaultTokens) {
      const filteredChains = token.chains.filter((tokenChain) => {
        const chain = chains[tokenChain.chainId];
        if (!chain) return false;
        return accountService.filterAccountsOnChain(accounts, chain).length > 0;
      });

      if (filteredChains.length === 0) continue;

      tokens.push({ ...token, chains: filteredChains });
    }

    return tokens;
  },
);

const $activeTokens = combine(
  {
    wallet: walletSelect.$selectedWallet,
    connections: networkModel.$connections,
    chains: networkModel.$chains,
    tokens: $tokens,
    filteredAccounts: $filteredAccounts,
    isShardsAccessDenied: shardsModel.$isAccessDenied,
  },
  ({ connections, chains, tokens, wallet, filteredAccounts }) => {
    if (nullable(wallet) || Object.keys(connections).length === 0) return DEFAULT_LIST;

    const activeTokens: AssetByChains[] = [];

    for (const token of tokens) {
      const filteredChains = token.chains.filter((c) => {
        const connection = connections[c.chainId];
        const chain = chains[c.chainId];

        if (nullable(connection)) return false;
        if (nullable(chain)) return false;
        if (networkUtils.isDisabledConnection(connection)) return false;

        return accountService.filterAccountsOnChain(filteredAccounts, chain).length > 0;
      });

      if (filteredChains.length === 0) continue;

      activeTokens.push({ ...token, chains: filteredChains });
    }

    return activeTokens;
  },
);

const $activeTokensWithBalance = combine(
  {
    activeTokens: $activeTokens,
    filteredAccounts: $filteredAccounts,
    chains: networkModel.$chains,
    balances: balanceModel.$balanceMap,
  },
  ({ activeTokens, balances, chains, filteredAccounts }) => {
    const tokens: AssetByChains[] = [];

    for (const token of activeTokens) {
      const chainsWithBalance = tokensService.getChainWithBalance(balances, token.chains, filteredAccounts, chains);

      if (chainsWithBalance.length === 0) {
        continue;
      }

      tokens.push({ ...token, chains: chainsWithBalance });
    }

    return tokens;
  },
);

const $filteredTokensWithBalance = combine(
  {
    activeTokensWithBalance: $activeTokensWithBalance,
    query: $query,
  },
  ({ activeTokensWithBalance, query }) => {
    let filteredTokens: AssetByChains[] = [];
    const fullChainMatch: number[] = [];

    for (const token of activeTokensWithBalance) {
      // Case 1: full match for token symbol -> get only that token across all chains
      if (query.toLowerCase() === token.symbol.toLowerCase()) {
        filteredTokens = [{ ...token, chains: token.chains }];
        break;
      }

      let tokenChains = [];
      for (const chain of token.chains) {
        // Case 2: full match for chain name -> get all tokens for that chain
        if (query.toLowerCase() === chain.name.toLowerCase()) {
          fullChainMatch.push(filteredTokens.length);
          tokenChains = [chain];
          break;
        }
        // Case 3: partial match for chain name or asset symbol
        if (includesMultiple([chain.name, chain.assetSymbol], query)) {
          tokenChains.push(chain);
        }
      }

      if (tokenChains.length === 0) continue;

      filteredTokens.push({ ...token, chains: tokenChains });
    }

    if (fullChainMatch.length === 0) return filteredTokens;

    return filteredTokens.filter((_, index) => fullChainMatch.includes(index));
  },
);

const $sortedTokens = combine(
  {
    query: $query,
    activeTokensWithBalance: $activeTokensWithBalance,
    hideZeroBalances: $hideZeroBalances,
    filteredTokens: $filteredTokensWithBalance,
    assetsPrices: priceProviderModel.$assetsPrices,
    fiatFlag: priceProviderModel.$fiatFlag,
    currency: currencyModel.$activeCurrency,
  },
  ({ query, activeTokensWithBalance, filteredTokens, hideZeroBalances, assetsPrices, fiatFlag, currency }) => {
    const tokenList = query
      ? filteredTokens
      : tokensService.hideZeroBalances(hideZeroBalances, activeTokensWithBalance);

    return tokensService.sortTokensByBalance(tokenList, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined);
  },
);

const $tokensPopulated = createStore(false).on(once($sortedTokens.updates), () => true);

export const portfolioModel = {
  $activeView,
  $accounts: $allInitiators,
  $sortedTokens,
  $tokensPopulated,

  populate: populateFx,

  events: {
    activeViewChanged,
    hideZeroBalancesChanged,
    queryChanged,
    transferStarted,
    receiveStarted,
  },

  _test: {
    $defaultTokens,
    $query,
  },
};
