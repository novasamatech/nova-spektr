import { combine, createApi, createEffect, createEvent, createStore, sample } from 'effector';
import sortBy from 'lodash/sortBy';

import {
  AccountId,
  AccountType,
  ChainId,
  ChainType,
  CryptoType,
  Signatory,
  SigningType,
  WalletType,
} from '@shared/core';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { networkModel, networkUtils } from '@entities/network';

const reset = createEvent();

export type Callbacks = {
  onComplete: () => void;
};

const $callbacks = createStore<Callbacks | null>(null).reset(reset);
const callbacksApi = createApi($callbacks, {
  callbacksChanged: (state, props: Callbacks) => ({ ...state, ...props }),
});

const walletCreated = createEvent<{
  name: string;
  threshold: number;
  creatorId: string;
}>();
const chainSelected = createEvent<ChainId>();
const signatoriesChanged = createEvent<Signatory[]>();

const $chain = createStore<ChainId | null>(null).reset(reset);
const $signatories = createStore<Signatory[]>([]).reset(reset);
const $error = createStore('').reset(reset);

const $isEthereumChain = combine(
  {
    chainId: $chain,
    chains: networkModel.$chains,
  },
  ({ chainId, chains }) => {
    return !!chainId && networkUtils.isEthereumBased(chains[chainId].options);
  },
);

type CreateWalletParams = {
  name: string;
  threshold: number;
  creatorId: string;
  signatories: Signatory[];
  chainId: ChainId | null;
  isEthereumChain: boolean;
};

const createWalletFx = createEffect(
  async ({ name, threshold, creatorId, signatories, chainId, isEthereumChain }: CreateWalletParams) => {
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = signatories.map((s) => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    walletModel.events.multisigCreated({
      wallet: {
        name,
        type: WalletType.MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [
        {
          signatories,
          chainId: chainId || undefined,
          name: name.trim(),
          accountId: accountId,
          threshold: threshold,
          creatorAccountId: creatorId as AccountId,
          cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        },
      ],
    });
  },
);

const $availableAccounts = combine(
  {
    wallets: walletModel.$wallets,
    chains: networkModel.$chains,
    chain: $chain,
  },
  ({ chain, wallets, chains }) => {
    if (!chain) return [];

    const filteredAccounts = walletUtils.getAccountsBy(wallets, (a, w) => {
      const isValidWallet = !walletUtils.isWatchOnly(w) && !walletUtils.isProxied(w);
      const isChainMatch = accountUtils.isChainAndCryptoMatch(a, chains[chain]);

      return isValidWallet && isChainMatch;
    });

    const baseAccounts = filteredAccounts.filter((a) => accountUtils.isBaseAccount(a) && a.name);

    return [...accountUtils.getAccountsAndShardGroups(filteredAccounts), ...baseAccounts];
  },
  { skipVoid: false },
);

sample({
  clock: chainSelected,
  target: $chain,
});

sample({
  clock: signatoriesChanged,
  target: $signatories,
});

sample({
  clock: walletCreated,
  source: {
    signatories: $signatories,
    chainId: $chain,
    isEthereumChain: $isEthereumChain,
  },
  fn: ({ signatories, ...rest }, resultValues) => ({
    ...rest,
    ...resultValues,
    signatories: sortBy(signatories, 'accountId'),
  }),
  target: createWalletFx,
});

sample({
  clock: createWalletFx.failData,
  fn: (error) => error.message,
  target: $error,
});

export const createMultisigWalletModel = {
  $availableAccounts,
  $chain,
  $isLoading: createWalletFx.pending,
  $error,
  events: {
    reset,
    callbacksChanged: callbacksApi.callbacksChanged,
    walletCreated,
    chainSelected,
    signatoriesChanged,
  },
};
