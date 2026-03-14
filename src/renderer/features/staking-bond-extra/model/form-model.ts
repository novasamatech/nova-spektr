import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { and, not, spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  fromPrecision,
  getRelaychainAsset,
  nonNullable,
  nullable,
  reservableAmountBN,
  transferableAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query/types';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { staking, stakingUtils } from '@/entities/staking';
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

const setReuseLockMode = createEvent<boolean>();
const $isReuseLockModeEnabled = createStore(false)
  .on(setReuseLockMode, (_, update) => update)
  .reset(formInitiated);

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingSubKey = createStore<ResourceRequestKey | null>(null).reset(formInitiated);
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
    },
  },
  validateOn: ['submit'],
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $initiatorBalance = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    return balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
  },
);

const $reservableAmount = $initiatorBalance.map((initiatorBalance) => {
  return initiatorBalance ? reservableAmountBN(initiatorBalance) : null;
});

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => (network ? (apis[network.chain.chainId] ?? null) : null),
);

const $coreTx = combine(
  {
    network: $networkStore,
    formParams: form.$values,
  },
  ({ network, formParams }) => {
    if (!formParams || !formParams.signatory || !formParams.amount) return null;

    return transactionBuilder.buildBondExtra({
      chain: network!.chain,
      asset: network!.asset,
      accountId: formParams.signatory.accountId,
      amount: formParams.amount,
    });
  },
);

const $feeTx = combine(
  {
    network: $networkStore,
    signatory: form.fields.signatory.$value,
    reservableAmount: $reservableAmount,
  },
  ({ network, signatory, reservableAmount }) => {
    if (!signatory || !reservableAmount || !network) return null;

    return transactionBuilder.buildBondExtra({
      chain: network.chain,
      asset: network.asset,
      accountId: signatory.accountId,
      amount: fromPrecision(reservableAmount, network.asset.precision),
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
  feeTransaction: $feeTx,
});

const $available = combine({ reservableAmount: $reservableAmount, fee: $fee }).map(({ reservableAmount, fee }) => {
  if (nullable(reservableAmount) || nullable(fee)) return null;

  const available = reservableAmount.sub(fee);
  return BN.max(BN_ZERO, available);
});

const $bondBalanceRange = combine($available, (available) => {
  if (!available || available.isZero()) return ZERO_BALANCE;

  return [ZERO_BALANCE, available];
});

const $reusableLock = combine({
  balance: $initiatorBalance,
  available: $available,
  initiator: form.fields.initiator.$value,
}).map(({ balance, available, initiator }) => {
  if (nullable(balance) || nullable(available) || nullable(initiator)) {
    return null;
  }

  const reusableLock = stakingUtils.reusableLockBN(balance);

  return BN.min(available, reusableLock);
});

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: bondExtraValidator,
  params: {
    api: $api,
    chain: $chain,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
    amount: form.fields.amount.$value,
  },
});

const $proxiedAccount = $route.map((route) => route.find(accountUtils.isProxiedAccount) ?? null);
const $multisigAccount = $route.map((route) => route.find(accountUtils.isAnyMultisigAccount) ?? null);
const $isProxy = $proxiedAccount.map(nonNullable);
const $isMultisig = $multisigAccount.map(nonNullable);

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
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

const $canSubmit = and($valid, form.$isValid, not($pendingFee));

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
  source: {
    networkStore: $networkStore,
    api: $api,
  },
  filter: ({ networkStore, api }, { initiator }) => {
    return Boolean(networkStore) && Boolean(api) && nonNullable(initiator);
  },
  fn: ({ networkStore, api }, { initiator }) => ({
    chainId: networkStore!.chain.chainId,
    api: api!,
    accounts: [initiator!.accountId],
  }),
  target: staking.stakingResource.subscribe,
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
  },
  filter: ({ networkStore, api }, { initiator }) => {
    return Boolean(networkStore) && Boolean(api) && nonNullable(initiator);
  },
  fn: ({ networkStore, api }, { initiator }) =>
    staking.stakingResource.createKey({
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts: [initiator!.accountId],
    }),
  target: $stakingSubKey,
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

sample({
  clock: [$reusableLock, setReuseLockMode.filter({ fn: (enabled) => enabled })],
  source: {
    isReuseLockModeEnabled: $isReuseLockModeEnabled,
    reusableLock: $reusableLock,
    network: $networkStore,
  },
  filter: ({ isReuseLockModeEnabled, reusableLock, network }) =>
    isReuseLockModeEnabled && nonNullable(reusableLock) && nonNullable(network),
  fn: ({ reusableLock, network }) => fromPrecision(reusableLock!, network!.asset.precision),
  target: form.fields.amount.change,
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
  clock: formSubmitted,
  source: $stakingSubKey,
  filter: nonNullable,
  target: staking.stakingResource.unsubscribe,
});

sample({
  clock: formCleared,
  source: $stakingSubKey,
  filter: nonNullable,
  target: staking.stakingResource.unsubscribe,
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $initiatorBalance,
  $bondBalanceRange,
  $proxyBalance,
  $proxiedAccount,
  $reusableLock,

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

  setReuseLockMode,

  events: {
    formInitiated,
    formCleared,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
