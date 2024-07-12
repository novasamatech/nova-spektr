import { createEvent, combine, restore, createEffect, Store, sample } from 'effector';

import { Chain, Account, Address, Asset, type ProxiedAccount, Balance, Wallet } from '@shared/core';
import { walletModel, walletUtils } from '@entities/wallet';
import { balanceModel, balanceUtils } from '@entities/balance';
import { transferableAmount } from '@shared/lib/utils';
import {
  validationUtils,
  TransferAccountStore,
  TransferSignatoryFeeStore,
  TransferAmountFeeStore,
  TransferRules,
  NetworkStore,
  BalanceMap,
} from '@features/operations/OperationsValidation';

type Input = {
  id?: number;
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

const formInitiated = createEvent<Input[]>();
const formConfirmed = createEvent();
const confirmed = createEvent();

const $confirmStore = restore(formInitiated, null);

const $storeMap = combine($confirmStore, (store) => {
  return (
    store?.reduce<Record<number, Input>>(
      (acc, input, index) => ({
        ...acc,
        [input.id ?? index]: input,
      }),
      {},
    ) || {}
  );
});

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

const $initiatorWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      const wallet = walletUtils.getWalletById(wallets, storeItem.account.walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

const $proxiedWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      if (!storeItem.proxiedAccount) return acc;

      const wallet = walletUtils.getWalletById(wallets, storeItem.proxiedAccount.walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

const $signerWallets = combine(
  {
    store: $confirmStore,
    wallets: walletModel.$wallets,
  },
  ({ store, wallets }) => {
    if (!store) return {};

    return store.reduce<Record<number, Wallet>>((acc, storeItem, index) => {
      const wallet = walletUtils.getWalletById(wallets, storeItem.signatory?.walletId || storeItem.account.walletId);
      if (!wallet) return acc;

      const id = storeItem.id ?? index;

      return {
        ...acc,
        [id]: wallet,
      };
    }, {});
  },
);

const $isXcm = combine($confirmStore, (store) => {
  if (!store) return {};

  return store.reduce<Record<number, boolean>>((acc, storeItem, index) => {
    const id = storeItem.id ?? index;

    return {
      ...acc,
      [id]: storeItem.xcmChain.chainId !== storeItem.chain.chainId,
    };
  }, {});
});

sample({
  clock: confirmed,
  source: {
    store: $confirmStore,
    balances: balanceModel.$balances,
  },
  filter: ({ store }) => Boolean(store),
  fn: ({ store, balances }) => ({
    store: store?.[0]!,
    balances,
  }),
  target: validateFx,
});

sample({
  clock: validateFx.done,
  target: formConfirmed,
});

export const confirmModel = {
  $confirmStore: $storeMap,
  $initiatorWallets,
  $proxiedWallets,
  $signerWallets,

  $isXcm,
  events: {
    formInitiated,
    confirmed,
  },
  output: {
    formConfirmed,
  },
};
