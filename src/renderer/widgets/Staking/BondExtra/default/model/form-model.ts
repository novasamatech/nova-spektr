import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nullable,
  stakeableAmount,
  transferableAmount,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxWrappers } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type WalletData } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

const formInitiated = createEvent<WalletData>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const multisigDepositChanged = createEvent<string>();

const txWrapperChanged = createEvent<{
  proxyAccount: AnyAccount | null;
  signatories: AnyAccount[][];
  isProxy: boolean;
  isMultisig: boolean;
}>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $chain = $networkStore.map((network) => network?.chain ?? null);

const $proxyAccount = createStore<AnyAccount | null>(null);
const $isProxy = createStore<boolean>(false);
const $isMultisig = createStore<boolean>(false);
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            isProxy: $isProxy,
            proxyBalance: $proxyBalance,
            network: $networkStore,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (
            initiator: AnyAccount | null,
            form: FormParams,
            { fee, isProxy, proxyBalance, network, initiatorBalance },
          ) => {
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy && new BN(fee).gt(new BN(proxyBalance))) {
              return { message: 'staking.bond.noBondBalanceError' };
            }

            if (isProxy && form.amount) {
              const amountBN = new BN(formatAmount(form.amount, network.asset.precision));

              if (amountBN.gt(new BN(initiatorBalance))) {
                return { message: 'staking.bond.noBondBalanceError' };
              }
            }
          },
        };
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            isMultisig: $isMultisig,
            fee: $fee,
            multisigDeposit: $multisigDeposit,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (signatory: AnyAccount | null, _: FormParams, { isMultisig, fee, multisigDeposit, signatoryBalance }) => {
            if (isMultisig && signatory && Object.keys(signatory).length === 0) {
              return { message: 'transfer.noSignatoryError' };
            }

            if (isMultisig && new BN(multisigDeposit).add(new BN(fee)).gt(new BN(signatoryBalance))) {
              return { message: 'proxy.addProxy.notEnoughMultisigTokens' };
            }
          },
        };
      },
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            network: $networkStore,
            bondBalanceRange: $bondBalanceRange,
            fee: $fee,
            isMultisig: $isMultisig,
            initiatorBalance: $initiatorBalance,
          }),
          fn: (value: string, form: FormParams, { network, bondBalanceRange, fee, isMultisig, initiatorBalance }) => {
            if (nullable(value)) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const bondBalance = Array.isArray(bondBalanceRange) ? bondBalanceRange[1] : bondBalanceRange;

            if (amountBN.gt(new BN(bondBalance))) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            if (!isMultisig && form.initiator) {
              if (amountBN.add(fee).gt(new BN(initiatorBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

// Computed

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return undefined;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
  { skipVoid: false },
);

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balances,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId.toString());

    return { account: initiator, balance: stakeableAmount(balance) };
  },
);

const $initiatorBalance = combine($account, (account) => {
  return account?.balance || ZERO_BALANCE;
});

const $bondBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ isProxy, network, proxyAccount, balances }) => {
    if (!isProxy || !network || !proxyAccount) {
      return ZERO_BALANCE;
    }

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balances,
    network: $networkStore,
  },
  ({ signatory, balances, network }) => {
    if (!signatory || !network) return ZERO_BALANCE;
    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId.toString(),
    );

    return transferableAmount(balance);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? apis[network.chain.chainId] : null;
  },
);

const $coreTx = combine(
  {
    network: $networkStore,
    formParams: form.$values,
  },
  ({ network, formParams }) => {
    if (!formParams || !formParams.initiator) return null;

    return transactionBuilder.buildBondExtra({
      chain: network!.chain,
      asset: network!.asset,
      accountId: formParams.initiator.accountId,
      amount: formParams.amount,
    });
  },
);

const $txWrappers = createTxWrappers({
  initiator: form.fields.initiator.$value,
  wallets: walletModel.$wallets,
  wallet: walletSelect.$selectedWallet,
  chain: $chain,
  signatory: form.fields.signatory.$value,
});

const { $fee, $pendingFee, $tx, $multisigTx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

//todo use $bondForm.$isValid in the future
const $isValid = combine(
  {
    initiatorErrors: form.fields.initiator.$errors,
    signatoryErrors: form.fields.signatory.$errors,
    amountErrors: form.fields.amount.$errors,
  },
  ({ initiatorErrors, signatoryErrors, amountErrors }) => {
    return initiatorErrors.length === 0 && signatoryErrors.length === 0 && amountErrors.length === 0;
  },
);

const $canSubmit = combine(
  {
    isFormValid: $isValid,
    isFeeLoading: $pendingFee,
  },
  ({ isFormValid, isFeeLoading }) => {
    return isFormValid && !isFeeLoading;
  },
);

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, initiator }) => Boolean(getRelaychainAsset(chain.assets)) && Boolean(initiator),
  fn: ({ chain, initiator }) => ({
    initiator,
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    networkStore: $networkStore,
  }),
});

sample({
  clock: txWrapperChanged,
  target: spread({
    isProxy: $isProxy,
    isMultisig: $isMultisig,
    proxyAccount: $proxyAccount,
  }),
});

sample({
  clock: form.fields.initiator.change,
  fn: () => [],
  target: form.fields.amount.setErrors,
});

sample({
  clock: form.fields.amount.change,
  fn: () => [],
  target: form.fields.initiator.setErrors,
});

// Submit

sample({
  clock: form.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (_, formData) => formData,
  target: formChanged,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
});

sample({
  clock: formCleared,
  target: [form.reset],
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $account,
  $initiatorBalance,
  $bondBalanceRange,
  $proxyBalance,

  $fee,
  $multisigDeposit,
  $pendingFee,
  $tx,
  $multisigTx,
  $route,

  $api,
  $coreTx,
  $txWrappers,
  $networkStore,
  $isMultisig,
  $canSubmit,

  events: {
    formInitiated,
    formCleared,

    txWrapperChanged,
    multisigDepositChanged,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
