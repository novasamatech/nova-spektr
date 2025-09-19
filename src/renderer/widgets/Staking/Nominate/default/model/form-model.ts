import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
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
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { type FormSubmitEvent } from '../lib/types';

type NetworkStore = {
  chain: Chain;
  shards: AnyAccount[];
};

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string | null;
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => (signatory) => {
        if (!signatory) {
          return { message: 'proxy.addProxy.noSignatoryError' };
        }
      },
    },
    amount: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            availableBalance: $availableBalance,
          }),
          fn: (_a, _f, { fee, availableBalance }) => {
            if (new BN(availableBalance).lt(new BN(fee))) {
              return { message: 'staking.notEnoughBalanceError' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

// Computed
const $availableBalance = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, balances }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);

    return stakeableAmount(balance);
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

// Signatory
const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

sample({
  clock: $signatories,
  filter: $signatories.map((x) => x.length === 1),
  fn: (s) => s.at(0) ?? null,
  target: form.fields.signatory.change,
});

const $coreTx = combine(
  {
    network: $networkStore,
    signatory: form.fields.signatory.$value,
  },
  ({ network, signatory }) => {
    if (nullable(network) || nullable(signatory)) return null;

    return transactionBuilder.buildNominate({
      chain: network.chain,
      accountId: signatory.accountId,
      nominators: [],
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

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isAnyMultisigAccount(acc));
});

const $proxyAccount = combine({ route: $route }, ({ route }) => {
  return route.find(accountUtils.isProxiedAccount) ?? null;
});

const $isProxy = $proxyAccount.map((account) => {
  return nonNullable(account);
});

const $proxyWallet = combine(
  {
    wallets: walletModel.$wallets,
    proxyAccount: $proxyAccount,
  },
  ({ wallets, proxyAccount }) => {
    if (nullable(proxyAccount)) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $proxyBalance = combine(
  {
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ proxyAccount, balances, network }) => {
    if (nullable(proxyAccount) || nullable(balances) || nullable(network)) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $api: $api,
  $threshold: $multisigThreshold,
});

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const nominateTxValidator = createTxValidator();
const { $errors } = createTxValidationStore({
  validator: nominateTxValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $canSubmit = combine(
  {
    isFormValid: form.$isValid,
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
  filter: ({ chain, shards }) => nonNullable(getRelaychainAsset(chain.assets)) && shards.length === 1,
  fn: ({ chain, shards }) => ({
    initiator: shards.at(0) ?? null,
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

// Submit
sample({
  clock: form.submit.doneData,
  source: {
    network: $networkStore,
    route: $route,
    fee: $fee.map((fee) => fee.toString()),
    multisigDeposit: $multisigDeposit,
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ network, selectedSignatory }) => {
    return nonNullable(network) && nonNullable(selectedSignatory);
  },
  fn: ({ selectedSignatory, network, ...fee }, formData) => {
    const { initiator } = formData;

    return {
      ...fee,
      multisigDeposit: fee.multisigDeposit.toString(),
      totalFee: fee.fee.toString(),
      chain: network!.chain,
      initiator: initiator!,
      signatory: selectedSignatory!,
    };
  },
  target: formSubmitted,
});

export const formModel = {
  form,
  $signatories,
  $selectedSignatory: form.fields.signatory.$value,

  $proxyWallet,
  $proxyBalance,

  $fee: $fee.map((fee) => fee.toString()),
  $pendingFee,
  $multisigDeposit,

  $isMultisig,
  $isProxy,
  $api,
  $networkStore,
  $tx,
  $canSubmit,
  $errors,

  formInitiated,
  formSubmitted,
};
