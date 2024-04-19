import { createEvent, combine, restore, createEffect, Store, sample } from 'effector';

import { Chain, Account, Address, Asset, type ProxiedAccount, Balance } from '@shared/core';
import { networkModel } from '@entities/network';
import { walletModel, walletUtils } from '@entities/wallet';
import { AccountStore, TransferRules, applyValidationRules } from '../lib/transfer-rules';
import { BalanceMap, NetworkStore } from '../lib/types';
import { balanceModel, balanceUtils } from '@/src/renderer/entities/balance';
import { transferableAmount } from '@/src/renderer/shared/lib/utils';

type Input = {
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory?: Account;
  amount: string;
  destination: Address;
  description: string;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<Input>();
const formConfirmed = createEvent();
const confirmed = createEvent();
const errorShown = createEvent<Error>();

const $confirmStore = restore(formInitiated, null);

type ValidateParams = {
  store: Input;
  balances: Balance[];
};

const validateFx = createEffect(({ store, balances }: ValidateParams) => {
  const rules = [
    {
      value: store.account,
      ...TransferRules.account.noProxyFee({} as Store<AccountStore>),
      source: {
        fee: store.fee,
        isProxy: !!store.proxiedAccount,
        proxyBalance:
          store.proxiedAccount &&
          transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.proxiedAccount.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
      },
    },
    {
      value: undefined,
      ...TransferRules.signatory.notEnoughTokens(
        {} as Store<{ fee: string; isMultisig: boolean; multisigDeposit: string; balance: string }>,
      ),
      source: {
        fee: store.fee,
        isMultisig: !!store.signatory,
        multisigDeposit: store.multisigDeposit,
        balance:
          store.signatory &&
          transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.signatory.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
      } as { fee: string; isMultisig: boolean; multisigDeposit: string; balance: string },
    },
    {
      value: store.amount,
      ...TransferRules.amount.notEnoughBalance({} as Store<{ network: NetworkStore | null; balance: BalanceMap }>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: store.chain, asset: store.asset },
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.chain.assets[0].assetId.toFixed(),
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
        },
      } as { network: NetworkStore | null; balance: BalanceMap },
    },
    {
      value: store.amount,
      ...TransferRules.amount.insufficientBalanceForFee(
        {} as Store<{
          fee: string;
          balance: BalanceMap;
          network: NetworkStore | null;
          isXcm: boolean;
          isNative: boolean;
          isMultisig: boolean;
          isProxy: boolean;
          xcmFee: string;
        }>,
        {
          withFormatAmount: false,
        },
      ),
      source: {
        network: { chain: store.chain, asset: store.asset },
        isMultisig: !!store.signatory,
        multisigDeposit: store.multisigDeposit,
        fee: store.fee,
        xcmFee: store.xcmFee,
        isProxy: !!store.proxiedAccount,
        isNative: store.chain.assets[0].assetId === store.asset.assetId,
        isXcm: store.xcmChain.chainId !== store.chain.chainId,
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.chain.assets[0].assetId.toFixed(),
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.account.accountId,
              store.chain.chainId,
              store.asset.assetId.toFixed(),
            ),
          ),
        },
      } as {
        fee: string;
        balance: BalanceMap;
        network: NetworkStore | null;
        isXcm: boolean;
        isNative: boolean;
        isMultisig: boolean;
        isProxy: boolean;
        xcmFee: string;
      },
    },
  ];

  const result = applyValidationRules(rules);

  if (!result) return;

  throw new Error(result.errorText);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    store: $confirmStore,
  },
  ({ apis, store }) => {
    return store ? apis[store.chain.chainId] : null;
  },
);

const $initiatorWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.account.walletId);
  },
  { skipVoid: false },
);

const $proxiedWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store || !store.proxiedAccount) return undefined;

    return walletUtils.getWalletById(wallets, store.proxiedAccount.walletId);
  },
  { skipVoid: false },
);

const $signerWallet = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return undefined;

    return walletUtils.getWalletById(wallets, store.signatory?.walletId || store.account.walletId);
  },
  { skipVoid: false },
);

const $isXcm = combine($confirmStore, (confirmStore) => {
  if (!confirmStore) return false;

  return confirmStore.xcmChain.chainId !== confirmStore.chain.chainId;
});

sample({
  clock: confirmed,
  source: {
    store: $confirmStore,
    balances: balanceModel.$balances,
  },
  filter: ({ store }) => Boolean(store),
  fn: ({ store, balances }) => ({
    store: store!,
    balances,
  }),
  target: validateFx,
});

sample({
  clock: validateFx.failData,
  target: errorShown,
});

sample({
  clock: validateFx.done,
  target: formConfirmed,
});

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $proxiedWallet,
  $signerWallet,

  $api,
  $isXcm,
  events: {
    formInitiated,
    confirmed,
  },
  output: {
    formConfirmed,
  },
};
