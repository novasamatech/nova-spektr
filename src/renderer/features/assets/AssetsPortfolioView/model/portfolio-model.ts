import { combine, createEvent, createStore, restore } from 'effector';
import { once } from 'patronum';

import { type Account, type AssetByChains } from '@/shared/core';
import { includesMultiple, nullable } from '@/shared/lib/utils';
import { AssetsListView } from '@/entities/asset';
import { balanceModel } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { currencyModel, priceProviderModel } from '@/entities/price';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { tokensService } from '../lib/tokensService';

const DEFAULT_LIST: never[] = [];

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

const $defaultTokens = createStore(tokensService.getTokensData());

const $tokens = combine(
  {
    defaultTokens: $defaultTokens,
    activeView: $activeView,
    wallet: walletModel.$activeWallet,
    chains: networkModel.$chains,
  },
  ({ defaultTokens, activeView, wallet, chains }) => {
    if (activeView !== AssetsListView.TOKEN_CENTRIC) return DEFAULT_LIST;
    if (nullable(wallet)) return DEFAULT_LIST;

    const tokens: AssetByChains[] = [];

    for (const token of defaultTokens) {
      const filteredChains = token.chains.filter((chain) => {
        return wallet.accounts.some((account) => {
          return (
            accountUtils.isNonBaseVaultAccount(account, wallet) &&
            accountUtils.isChainAndCryptoMatch(account, chains[chain.chainId])
          );
        });
      });

      if (filteredChains.length === 0) continue;

      tokens.push({ ...token, chains: filteredChains });
    }

    return tokens;
  },
);

const $activeTokens = combine(
  {
    wallet: walletModel.$activeWallet,
    connections: networkModel.$connections,
    chains: networkModel.$chains,
    tokens: $tokens,
  },
  ({ connections, chains, tokens, wallet }) => {
    if (nullable(wallet) || Object.keys(connections).length === 0) return DEFAULT_LIST;

    const isMultisigWallet = walletUtils.isMultisig(wallet);
    const hasAccounts = wallet.accounts.length > 0;
    const multisigChainToInclude = isMultisigWallet && hasAccounts ? wallet.accounts.at(0)?.chainId : undefined;

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
);

const $activeTokensWithBalance = combine(
  {
    activeTokens: $activeTokens,
    accounts: $accounts,
    balances: balanceModel.$balances,
  },
  ({ activeTokens, balances, accounts }) => {
    const tokens: AssetByChains[] = [];

    for (const token of activeTokens) {
      const chainsWithBalance = tokensService.getChainWithBalance(balances, token.chains, accounts);

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
    $hideZeroBalances: $hideZeroBalances,
    filteredTokens: $filteredTokensWithBalance,
    assetsPrices: priceProviderModel.$assetsPrices,
    fiatFlag: priceProviderModel.$fiatFlag,
    currency: currencyModel.$activeCurrency,
  },
  ({ query, activeTokensWithBalance, filteredTokens, $hideZeroBalances, assetsPrices, fiatFlag, currency }) => {
    const tokenList = query
      ? filteredTokens
      : tokensService.hideZeroBalances($hideZeroBalances, activeTokensWithBalance);

    return tokensService.sortTokensByBalance(tokenList, assetsPrices, fiatFlag ? currency?.coingeckoId : undefined);
  },
);

const $tokensPopulated = createStore(false).on(once($sortedTokens.updates), () => true);

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
    $defaultTokens,
    $query,
  },
};
