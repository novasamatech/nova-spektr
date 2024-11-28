import { type Store, combine, createEffect, createEvent, restore, sample } from 'effector';

import {
  type Account,
  type Address,
  type Asset,
  type Balance,
  type Chain,
  type ProxiedAccount,
  type Transaction,
  type Wallet,
} from '@/shared/core';
import { nonNullable, transferableAmount, withdrawableAmount } from '@/shared/lib/utils';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { operationsModel, operationsUtils } from '@/entities/operations';
import { walletModel, walletUtils } from '@/entities/wallet';
import {
  type BalanceMap,
  type NetworkStore,
  type TransferAccountStore,
  type TransferAmountFeeStore,
  TransferRules,
  type TransferSignatoryFeeStore,
  validationUtils,
} from '@/features/operations/OperationsValidation';

type Input = {
  id?: number;
  xcmChain: Chain;
  chain: Chain;
  asset: Asset;
  account: Account;
  proxiedAccount?: ProxiedAccount;
  signatory: Account | null;
  amount: string;
  destination: Address;

  fee: string;
  xcmFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
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
      value: store.signatory || store.account,
      form: {},
      ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
      source: {
        fee: store.fee,
        isProxy: !!store.proxiedAccount,
        proxyBalance: {
          native:
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
          withdrawableAmount(
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
    store: store![0],
    balances,
  }),
  target: validateFx,
});

sample({
  clock: validateFx.done,
  target: formConfirmed,
});

const $isMultisigExists = combine(
  {
    apis: networkModel.$apis,
    coreTxs: $storeMap.map((storeMap) =>
      Object.values(storeMap)
        .map((store) => store.coreTx)
        .filter(nonNullable),
    ),
    transactions: operationsModel.$multisigTransactions,
  },
  ({ apis, coreTxs, transactions }) => operationsUtils.isMultisigAlreadyExists({ apis, coreTxs, transactions }),
);

export const confirmModel = {
  $confirmStore: $storeMap,
  $initiatorWallets,
  $proxiedWallets,
  $signerWallets,
  $isMultisigExists,

  $isXcm,
  events: {
    formInitiated,
    confirmed,
  },
  output: {
    formConfirmed,
  },
};
