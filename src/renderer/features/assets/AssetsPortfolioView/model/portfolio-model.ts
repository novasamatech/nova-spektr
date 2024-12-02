import { createEffect, createEvent, createStore, restore, sample } from 'effector';
import { once } from 'patronum';

import { type Account, type AssetByChains, type Balance, type Chain, type ChainId, type Wallet } from '@/shared/core';
import { includes, nullable } from '@/shared/lib/utils';
import { AssetsListView } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
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
const $activeTokensWithBalance = createStore<AssetByChains[]>([]);
const $filteredTokens = createStore<AssetByChains[]>([]);
const $sortedTokens = createStore<AssetByChains[]>([]);

const $tokensPopulated = createStore(false).on(once($sortedTokens.updates), () => true);

type UpdateTokenParams = {
  activeWallet?: Wallet;
  chains: Record<ChainId, Chain>;
};

const getUpdatedTokensFx = createEffect(({ activeWallet, chains }: UpdateTokenParams): AssetByChains[] => {
  const tokens = tokensService.getTokensData();
  const updatedTokens: AssetByChains[] = [];

  for (const token of tokens) {
    const filteredChains = token.chains.filter((chain) => {
      return activeWallet?.accounts.some((account) => {
        return (
          accountUtils.isNonBaseVaultAccount(account, activeWallet) &&
          accountUtils.isChainAndCryptoMatch(account, chains[chain.chainId])
        );
      });
    });

    if (filteredChains.length === 0) continue;

    updatedTokens.push({ ...token, chains: filteredChains });
  }

  return updatedTokens;
});

type PopulateBalanceParams = {
  activeTokens: AssetByChains[];
  balances: Balance[];
  accounts: Account[];
};

const populateTokensBalanceFx = createEffect(
  ({ activeTokens, balances, accounts }: PopulateBalanceParams): AssetByChains[] => {
    const tokens: AssetByChains[] = [];

    for (const token of activeTokens) {
      const [chainsWithBalance, totalBalance] = tokensService.getChainWithBalance(balances, token.chains, accounts);

      if (chainsWithBalance.length === 0) continue;

      tokens.push({ ...token, chains: chainsWithBalance, totalBalance });
    }

    return tokens;
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
  clock: [networkModel.$connections, $tokens],
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
    const hasAccounts = activeWallet!.accounts.length > 0;
    const multisigChainToInclude = isMultisigWallet && hasAccounts ? activeWallet.accounts[0].chainId : undefined;

    const activeTokens: AssetByChains[] = [];

    for (const token of tokens) {
      const filteredChains = token.chains.filter((c) => {
        const connection = connections[c.chainId];

        if (nullable(connection)) return false;
        if (networkUtils.isDisabledConnection(connection)) return false;
        if (nullable(chains[c.chainId])) return false;
        if (!isMultisigWallet) return true;

        return networkUtils.isMultisigSupported(chains[c.chainId].options) || multisigChainToInclude === c.chainId;
      });

      if (filteredChains.length === 0) continue;

      activeTokens.push({ ...token, chains: filteredChains });
    }

    return activeTokens;
  },
  target: $activeTokens,
});

sample({
  clock: [balanceModel.$balances, networkModel.$connections, $accounts, $tokens],
  source: {
    activeView: $activeView,
    activeTokens: $activeTokens,
    accounts: $accounts,
    balances: balanceModel.$balances,
  },
  filter: ({ activeView, balances }) => {
    return Boolean(activeView === AssetsListView.TOKEN_CENTRIC && balances.length > 0);
  },
  target: populateTokensBalanceFx,
});

sample({
  clock: populateTokensBalanceFx.doneData,
  target: $activeTokensWithBalance,
});

sample({
  clock: [$activeTokensWithBalance, queryChanged],
  source: { activeTokensWithBalance: $activeTokensWithBalance, query: $query },
  fn: ({ activeTokensWithBalance, query }) => {
    const filteredTokens: AssetByChains[] = [];

    for (const token of activeTokensWithBalance) {
      const filteredChains = token.chains.filter((chain) => {
        const hasSymbol = includes(chain.assetSymbol, query);
        const hasAssetName = includes(token.name, query);
        const hasChainName = includes(chain.name, query);

        return hasSymbol || hasAssetName || hasChainName;
      });

      if (filteredChains.length === 0) continue;

      filteredTokens.push({ ...token, chains: filteredChains });
    }

    return filteredTokens;
  },
  target: $filteredTokens,
});

sample({
  clock: [$activeTokensWithBalance, $filteredTokens, $hideZeroBalances],
  source: {
    query: $query,
    activeTokensWithBalance: $activeTokensWithBalance,
    $hideZeroBalances: $hideZeroBalances,
    filteredTokens: $filteredTokens,
    assetsPrices: priceProviderModel.$assetsPrices,
    fiatFlag: priceProviderModel.$fiatFlag,
    currency: currencyModel.$activeCurrency,
  },
  fn: ({ query, activeTokensWithBalance, filteredTokens, $hideZeroBalances, assetsPrices, fiatFlag, currency }) => {
    const tokenList = query
      ? filteredTokens
      : tokensService.hideZeroBalances($hideZeroBalances, activeTokensWithBalance);

    return tokensService.sortTokensByBalance(tokenList, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined);
  },
  target: $sortedTokens,
});

export const portfolioModel = {
  $activeView,
  $accounts,
  $sortedTokens,
  $tokensPopulated,
  events: {
    activeViewChanged,
    accountsChanged,
    hideZeroBalancesChanged,
    queryChanged,
    transferStarted,
    receiveStarted,
  },

  _test: {
    $activeTokensWithBalance,
    $filteredTokens,
    $query,
  },
};
