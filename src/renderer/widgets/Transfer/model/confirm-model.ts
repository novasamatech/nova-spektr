import { createEvent, combine, restore, createEffect, Store, sample } from 'effector';

import { Chain, Account, Address, Asset, type ProxiedAccount, Balance } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { BalanceMap, NetworkStore } from '../lib/types';
import { balanceModel, balanceUtils } from '@entities/balance';
import { transferableAmount } from '@shared/lib/utils';
import {
  validationUtils,
  TransferAccountStore,
  TransferSignatoryFeeStore,
  TransferAmountFeeStore,
  TransferRules,
} from '@features/operations/OperationsValidation';

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

const $confirmStore = restore(formInitiated, null);

type ValidateParams = {
  store: Input;
  balances: Balance[];
};

const validateFx = createEffect(({ store, balances }: ValidateParams) => {
  const rules = [
    {
      value: store.account,
      form: {},
      ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
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
      form: {},
      ...TransferRules.signatory.notEnoughTokens({} as Store<TransferSignatoryFeeStore>),
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
      } as TransferSignatoryFeeStore,
    },
    {
      value: store.amount,
      form: {},
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
      form: {},
      ...TransferRules.amount.insufficientBalanceForFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
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
      } as TransferAmountFeeStore,
    },
  ];

  const result = validationUtils.applyValidationRules(rules);

  if (!result) return;

  throw new Error(result.errorText);
});

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
  clock: validateFx.done,
  target: formConfirmed,
});

export const confirmModel = {
  $confirmStore,
  $initiatorWallet,
  $proxiedWallet,
  $signerWallet,

  $isXcm,
  events: {
    formInitiated,
    confirmed,
  },
  output: {
    formConfirmed,
  },
};
