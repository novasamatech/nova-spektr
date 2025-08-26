import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  stakeableAmount,
  transferableAmount,
} from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { bondExtraValidator } from '@/features/operations/OperationsValidation';
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

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => (initiator) => {
        if (!initiator) {
          return { message: 'staking.bond.noInitiatorError' };
        }
      },
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (nullable(signatory)) {
          return { message: 'transfer.noSignatoryError' };
        }
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

const $initiatorBalance = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return ZERO_BALANCE;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);

    return stakeableAmount(balance);
  },
);

const $bondBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => (network ? apis[network.chain.chainId] : null),
);

const $coreTx = combine(
  {
    network: $networkStore,
    formParams: form.$values,
  },
  ({ network, formParams }) => {
    if (!formParams || !formParams.signatory) return null;

    return transactionBuilder.buildBondExtra({
      chain: network!.chain,
      asset: network!.asset,
      accountId: formParams.signatory.accountId,
      amount: formParams.amount,
    });
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
});

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors } = createTxValidationStore({
  validator: bondExtraValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $proxiedAccount = $route.map((route) => route.find(accountUtils.isProxiedAccount) ?? null);
const $multisigAccount = $route.map((route) => route.find(accountUtils.isMultisigAccount) ?? null);
const $isProxy = $proxiedAccount.map(nonNullable);
const $isMultisig = $multisigAccount.map(nonNullable);

const $multisigThreshold = $route.map((route) => {
  const multisig = route.find(accountUtils.isMultisigAccount);
  if (!multisig) return null;

  return multisig.threshold;
});

const { $multisigDeposit, $pending: _pendingDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxiedAccount,
    balances: balanceModel.$balanceMap,
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
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxiedAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
    isFeeLoading: $pendingFee,
  },
  ({ isFormValid, isFeeLoading }) => isFormValid && !isFeeLoading,
);

// Fields connections
sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, initiator }) => nonNullable(getRelaychainAsset(chain.assets)) && nonNullable(initiator),
  fn: ({ chain, initiator }) => ({
    initiator,
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
});

sample({
  clock: formInitiated,
  source: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: form.fields.signatory.change,
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
  filter: (networkStore) => nonNullable(networkStore),
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

  $initiatorBalance,
  $bondBalanceRange,
  $proxyBalance,
  $proxiedAccount,

  $fee,
  $multisigDeposit,
  $pendingFee,
  $tx,
  $route,

  $api,
  $coreTx,
  $networkStore,
  $multisigAccount,
  $isMultisig,
  $canSubmit,
  $errors,

  events: {
    formInitiated,
    formCleared,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
