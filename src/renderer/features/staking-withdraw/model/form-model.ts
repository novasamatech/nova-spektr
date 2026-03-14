import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample, scopeBind } from 'effector';
import { noop } from 'lodash';
import { and, not, spread } from 'patronum';

import { type Asset, type Chain, type ProxiedAccount, type Transaction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getRelaychainAsset,
  nonNullable,
  nullable,
  redeemableAmount,
  transferableAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query';
import { createComplexTxStore, createSignatoriesStore, createTxValidationStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { eraService, staking } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { withdrawValidator } from '@/features/operations/OperationsValidation';
import { type NetworkStore } from '../lib/types';

export type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transaction: Transaction;
  formData: {
    amount: string;
    initiator: AnyAccount;
    signatory: AnyAccount;
    proxiedAccount?: ProxiedAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const eraSet = createEvent<number>();
const formCleared = createEvent();

const multisigDepositChanged = createEvent<string>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingResourceKey = createStore<ResourceRequestKey | null>(null);
const $era = restore(eraSet, null);
const $eraUnsub = createStore<() => void>(noop);

const $staking = combine(staking.stakingResource.$cache, $networkStore, (cache, network) =>
  network ? (cache[network.chain.chainId] ?? null) : null,
);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
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
            fee: $fee,
            isMultisig: $isMultisig,
            signatoryBalance: $signatoryBalance,
          }),
          fn: (value, _, { fee, isMultisig, signatoryBalance }) => {
            if (!value) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            if (isMultisig) {
              const isEnough = new BN(signatoryBalance).gt(new BN(fee));

              if (!isEnough) {
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

// Effects

const subscribeEraFx = createEffect((api: ApiPromise): Promise<() => void> => {
  const boundEraSet = scopeBind(eraSet, { safe: true });

  return eraService.subscribeActiveEra(api, (era) => {
    if (!era) return;

    boundEraSet(era);
  });
});

// Computed

const $withdrawBalance = combine(
  {
    initiator: form.fields.initiator.$value,
    era: $era,
    staking: $staking,
  },
  ({ era, initiator, staking }) => {
    if (!staking || !initiator) return ZERO_BALANCE;

    const withdraw = redeemableAmount(staking[initiator.accountId]?.unlocking, era || 0);

    return withdraw;
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

sample({
  clock: $signatories,
  filter: (signatories) => signatories.length > 0,
  fn: (signatories) => signatories.at(0)!,
  target: form.fields.signatory.change,
});

const $signatoryBalance = combine(
  {
    signatory: form.fields.signatory.$value,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ signatory, balances, network }) => {
    if (!signatory || !network) return ZERO_BALANCE;
    const balance = balanceUtils.getBalance(
      balances,
      signatory.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $isChainConnected = combine(
  {
    network: $networkStore,
    statuses: networkModel.$connectionStatuses,
  },
  ({ network, statuses }) => {
    if (!network) return false;

    const status = statuses[network.chain.chainId];
    if (!status) return false;

    return networkUtils.isConnectedStatus(status);
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    if (!network) return null;

    return apis[network.chain.chainId] ?? null;
  },
);

const $coreTx = combine(
  {
    network: $networkStore,
    form: form.$values,
    isConnected: $isChainConnected,
  },
  ({ network, form, isConnected }) => {
    if (!network || !isConnected || !form.signatory) return null;

    return transactionBuilder.buildWithdraw({
      chain: network.chain,
      accountId: form.signatory.accountId,
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

const $isProxy = $route.map((route) => nonNullable(route.find((account) => accountUtils.isProxiedAccount(account))));
const $isMultisig = $route.map((route) => route.some((account) => accountUtils.isAnyMultisigAccount(account)));
const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    account: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, account, wallets }) => {
    if (!isProxy || !account) return null;

    return walletUtils.getWalletById(wallets, account.walletId);
  },
);

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: withdrawValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $isStakingLoading = $staking.map((s) => s === null);

const $canSubmit = and($valid, form.$isValid, not($pendingFee), not($isStakingLoading), not(subscribeEraFx.pending));

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  fn: ({ chain, shards }) => {
    return {
      initiator: shards[0],
      networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    };
  },
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
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ networkStore, api, initiator }) => {
    return nonNullable(networkStore) && nonNullable(api) && nonNullable(initiator);
  },
  fn: ({ networkStore, api, initiator }) => {
    return {
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts: [initiator!.accountId],
    };
  },
  target: staking.stakingResource.start,
});

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ networkStore, api, initiator }) => {
    return nonNullable(networkStore) && nonNullable(api) && nonNullable(initiator);
  },
  fn: ({ networkStore, api, initiator }) =>
    staking.stakingResource.createKey({
      chainId: networkStore!.chain.chainId,
      api: api!,
      accounts: [initiator!.accountId],
    }),
  target: $stakingResourceKey,
});

sample({
  clock: formInitiated,
  source: $api,
  filter: (api): api is ApiPromise => nonNullable(api),
  target: subscribeEraFx,
});

sample({
  clock: subscribeEraFx.doneData,
  target: $eraUnsub,
});

//todo not sure if there is any reason to do that actually
sample({
  clock: formInitiated,
  source: form.fields.initiator.$value,
  filter: (initiator) => nonNullable(initiator),
  target: form.fields.initiator.change,
});

sample({
  clock: form.fields.initiator.change,
  target: form.fields.amount.reset,
});

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
    proxyAccount: $proxyAccount,
  },
  ({ isProxy, balances, network, proxyAccount }) => {
    if (!isProxy || !network || !proxyAccount) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    amount: $withdrawBalance,
    proxyAccount: $proxyAccount,
    network: $networkStore,
    transaction: $tx,
    isProxy: $isProxy,
    fee: $fee.map((fee) => fee?.toString()),
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, transaction, fee }) => {
    return nonNullable(network) && nonNullable(transaction) && nonNullable(fee);
  },
  fn: ({ proxyAccount, transaction, isProxy, fee, ...rest }, formData) => {
    return {
      transaction: transaction!,
      formData: {
        ...rest,
        ...formData,
        ...(isProxy && { proxiedAccount: proxyAccount as ProxiedAccount }),
        fee: fee!,
        totalFee: fee!,
        initiator: formData.initiator!,
        signatory: formData.signatory!,
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: [formInitiated, $withdrawBalance],
  source: $withdrawBalance,
  fn: (withdrawBalance, _) => withdrawBalance,
  target: form.fields.amount.change,
});

sample({
  clock: [formSubmitted, formCleared],
  source: $stakingResourceKey,
  filter: nonNullable,
  target: staking.stakingResource.stop,
});

sample({
  clock: formSubmitted,
  target: attach({
    source: $eraUnsub,
    effect: (unsub) => unsub(),
  }),
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,
  $proxyWallet,
  $signatories,

  $fee,
  $proxyBalance,
  $withdrawBalance,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $coreTx,
  $tx,
  $route,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading,
  $isEraLoading: subscribeEraFx.pending,
  $canSubmit,
  $errors,

  events: {
    formInitiated,
    formCleared,
    multisigDepositChanged,
  },
  output: {
    formSubmitted,
  },
};
