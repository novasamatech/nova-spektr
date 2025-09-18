import { type BN } from '@polkadot/util';
import { type Store, createEffect, createEvent, createStore, sample } from 'effector';

import { type Address, type Asset, type BalanceMap, type Chain } from '@/shared/core';
import { getNativeAsset, nonNullable, transferableAmount, withdrawableAmount } from '@/shared/lib/utils';
import { type TxConfirmInfo, createTransactionConfirmStore } from '@/shared/transactions';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { selectedWalletMultisigOperations } from '@/aggregates/selected-wallet-multisig-operations';
import {
  type NetworkStore,
  type TransferAccountStore,
  type TransferAmountFeeStore,
  TransferRules,
  type TransferSignatoryFeeStore,
  type ValidatorBalanceMap,
  validationUtils,
} from '@/features/operations/OperationsValidation';

export type TransferConfirmStore = TxConfirmInfo & {
  destinationChain: Chain;
  asset: Asset;
  amount: string;
  destination: Address;

  fee: BN;
  xcmFee: BN;
  deliveryFee: BN;
  multisigDeposit: BN;
};

const { $confirmMap, $confirms, $isMultisigExists, init, startSigning } =
  createTransactionConfirmStore<TransferConfirmStore>({
    $apis: networkModel.$apis,
    $wallets: walletModel.$wallets,
    $multisigTransactions: selectedWalletMultisigOperations.$list,
  });

const confirmed = createEvent();

const $error = createStore<Error | null>(null);

type ValidateParams = {
  store: TransferConfirmStore;
  balances: BalanceMap;
};

const validateFx = createEffect(({ store, balances }: ValidateParams) => {
  const proxyAccount = store.route.find(accountUtils.isProxiedAccount);
  const hasAnyMultisigAccount = store.route.find(accountUtils.isAnyMultisigAccount);

  const rules = [
    {
      value: store.signatory,
      form: {},
      ...TransferRules.account.noProxyFee({} as Store<TransferAccountStore>),
      source: {
        fee: store.fee,
        isProxy: nonNullable(proxyAccount),
        proxyBalance: {
          native:
            proxyAccount &&
            transferableAmount(
              balanceUtils.getBalance(
                balances,
                proxyAccount.accountId,
                store.chain.chainId,
                getNativeAsset(store.chain.assets).assetId,
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
        isMultisig: nonNullable(hasAnyMultisigAccount),
        multisigDeposit: store.multisigDeposit,
        balance:
          store.signatory &&
          withdrawableAmount(
            balanceUtils.getBalance(
              balances,
              store.signatory.accountId,
              store.chain.chainId,
              getNativeAsset(store.chain.assets).assetId,
            ),
          ),
      } as TransferSignatoryFeeStore,
    },
    {
      value: store.amount,
      form: {},
      ...TransferRules.amount.notEnoughBalance(
        {} as Store<{ network: NetworkStore | null; balance: ValidatorBalanceMap }>,
        {
          withFormatAmount: false,
        },
      ),
      source: {
        network: { chain: store.chain, asset: store.asset },
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.initiator.accountId,
              store.chain.chainId,
              getNativeAsset(store.chain.assets).assetId,
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, store.initiator.accountId, store.chain.chainId, store.asset.assetId),
          ),
        },
      } as { network: NetworkStore | null; balance: ValidatorBalanceMap },
    },
    {
      value: store.amount,
      form: {},
      ...TransferRules.amount.insufficientBalanceForFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: store.chain, asset: store.asset },
        isAnyMultisig: nonNullable(hasAnyMultisigAccount),
        multisigDeposit: store.multisigDeposit,
        fee: store.fee,
        xcmFee: store.xcmFee,
        deliveryFee: store.deliveryFee,
        isProxy: nonNullable(proxyAccount),
        isNative: getNativeAsset(store.chain.assets).assetId === store.asset.assetId,
        isXcm: store.destinationChain.chainId !== store.chain.chainId,
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.initiator.accountId,
              store.chain.chainId,
              getNativeAsset(store.chain.assets).assetId,
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, store.initiator.accountId, store.chain.chainId, store.asset.assetId),
          ),
        },
      } as TransferAmountFeeStore,
    },
    {
      value: store.amount,
      form: {},
      ...TransferRules.amount.insufficientBalanceForDeliveryFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: store.chain, asset: store.asset },
        isAnyMultisig: nonNullable(hasAnyMultisigAccount),
        multisigDeposit: store.multisigDeposit,
        fee: store.fee,
        xcmFee: store.xcmFee,
        deliveryFee: store.deliveryFee,
        isProxy: !nonNullable(proxyAccount),
        isNative: getNativeAsset(store.chain.assets).assetId === store.asset.assetId,
        isXcm: store.destinationChain.chainId !== store.chain.chainId,
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.initiator.accountId,
              store.chain.chainId,
              getNativeAsset(store.chain.assets).assetId,
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, store.initiator.accountId, store.chain.chainId, store.asset.assetId),
          ),
        },
      } as TransferAmountFeeStore,
    },
    {
      value: store.amount,
      form: {},
      ...TransferRules.amount.insufficientBalanceForXcmFee({} as Store<TransferAmountFeeStore>, {
        withFormatAmount: false,
      }),
      source: {
        network: { chain: store.chain, asset: store.asset },
        isAnyMultisig: nonNullable(hasAnyMultisigAccount),
        multisigDeposit: store.multisigDeposit,
        fee: store.fee,
        xcmFee: store.xcmFee,
        deliveryFee: store.deliveryFee,
        isProxy: nonNullable(proxyAccount),
        isNative: getNativeAsset(store.chain.assets).assetId === store.asset.assetId,
        isXcm: store.destinationChain.chainId !== store.chain.chainId,
        balance: {
          native: transferableAmount(
            balanceUtils.getBalance(
              balances,
              store.initiator.accountId,
              store.chain.chainId,
              getNativeAsset(store.chain.assets).assetId,
            ),
          ),
          balance: transferableAmount(
            balanceUtils.getBalance(balances, store.initiator.accountId, store.chain.chainId, store.asset.assetId),
          ),
        },
      } as TransferAmountFeeStore,
    },
  ];

  const result = validationUtils.applyValidationRules(rules);

  if (!result) return;

  const error = new Error(result.errorText);
  console.error(error);

  throw error;
});

sample({
  clock: startSigning,
  source: {
    store: $confirmMap,
    balances: balanceModel.$balanceMap,
  },
  filter: ({ store }) => nonNullable(store),
  fn: ({ store, balances }) => ({
    store: store[0].meta,
    balances,
  }),
  target: validateFx,
});

sample({
  clock: validateFx.done,
  target: confirmed,
});

sample({
  clock: validateFx.failData,
  target: $error,
});

sample({
  clock: startSigning,
  fn: () => null,
  target: $error,
});

export const confirmModel = {
  $confirmMap,
  $confirms,
  $isMultisigExists,
  $error,

  init,
  startSigning,
  confirmed,
};
