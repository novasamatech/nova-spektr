import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { and, not, spread } from 'patronum';

import { type Asset, type Chain, type Transaction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query';
import {
  createComplexTxStore,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
} from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { staking, stakingService } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { unstakeValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { type NetworkStore } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = {
  transaction: Transaction | null;
  formData: FormParams & {
    route: AnyAccount[];
    signatory: AnyAccount;
    fee: string;
    totalFee: string;
    multisigDeposit: string;
    initiator: AnyAccount;
  };
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingResourceKey = createStore<ResourceRequestKey | null>(null);
const $minBond = createStore<string>(ZERO_BALANCE);

const $staking = combine(staking.stakingResource.$cache, $networkStore, (cache, network) =>
  network ? (cache[network.chain.chainId] ?? null) : null,
);

const $unstakeBalanceRange = createStore<string | string[]>(ZERO_BALANCE);

const $chain = $networkStore.map((network) => network?.chain ?? null);

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
            availableBalance: $availableBalance,
            network: $networkStore,
            unstakeBalanceRange: $unstakeBalanceRange,
          }),
          fn: (value, _f, { fee, availableBalance, unstakeBalanceRange, network }) => {
            if (!value) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const unstakeBalance = Array.isArray(unstakeBalanceRange) ? unstakeBalanceRange[1] : unstakeBalanceRange;

            const isEnough = new BN(fee).lte(new BN(availableBalance.balance));

            if (!isEnough) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
            }

            if (amountBN.gt(new BN(unstakeBalance))) {
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
    staking: $staking,
    balances: balanceModel.$balanceMap,
  },
  ({ network, wallet, initiator, staking, balances }) => {
    if (!wallet || !network || !staking || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    const activeStake = staking[initiator.accountId]?.active || ZERO_BALANCE;

    return {
      balance: transferableAmount(balance),
      stake: activeStake,
    };
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
    signatory: form.fields.signatory.$value,
    amount: form.fields.amount.$value,
    staking: $staking,
    minBond: $minBond,
    isConnected: $isChainConnected,
  },
  ({ network, signatory, amount, staking, minBond, isConnected }) => {
    if (nullable(network) || !isConnected || nullable(signatory)) {
      return null;
    }
    const formattedAmount = formatAmount(amount, network.asset.precision);
    const leftAmount = new BN(staking?.[signatory.accountId]?.active || ZERO_BALANCE).sub(new BN(formattedAmount));
    const withChill = leftAmount.lte(new BN(minBond));

    return transactionBuilder.buildUnstake({
      chain: network.chain,
      asset: network.asset,
      accountId: signatory.accountId,
      amount: amount || ZERO_BALANCE,
      withChill,
    });
  },
);

// Signatory

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } =
  createSigningPathModel({
    initiator: form.fields.initiator.$value,
    chain: $chain,
    resetOn: formInitiated,
    resetUserOverrideOn: form.fields.initiator.change,
  });

sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
  routeOverride: $pathRoute,
});

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isAnyMultisigAccount(acc));
});

const $isProxy = $route.map((route) => {
  return route.some((acc) => accountUtils.isProxiedAccount(acc));
});

const $proxyAccount = combine(
  {
    route: $route,
    isProxy: $isProxy,
  },
  ({ route, isProxy }) => {
    if (!isProxy) return null;

    return route.find(accountUtils.isProxiedAccount)!;
  },
);

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

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: unstakeValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $isStakingLoading = $staking.map((s) => s === null);

const $canSubmit = and($valid, form.$isValid, not($pendingFee), not($isStakingLoading));

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

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return stakingService.getMinNominatorBond(api);
});

sample({
  clock: formInitiated,
  source: $api,
  filter: (api): api is ApiPromise => nonNullable(api),
  target: getMinNominatorBondFx,
});

sample({
  clock: getMinNominatorBondFx.doneData,
  target: $minBond,
});

// subscribe to staking data

sample({
  clock: formInitiated,
  source: {
    networkStore: $networkStore,
    api: $api,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ networkStore, api, initiator }) => {
    return Boolean(networkStore) && Boolean(api) && nonNullable(initiator);
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
    return Boolean(networkStore) && Boolean(api) && nonNullable(initiator);
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
  source: {
    availableBalance: $availableBalance,
  },
  fn: ({ availableBalance }) => {
    if (nullable(availableBalance)) return ZERO_BALANCE;

    return [ZERO_BALANCE, availableBalance.stake];
  },
  target: $unstakeBalanceRange,
});

// Multisig deposit calculation
const $multisigThreshold = $route.map((route) => {
  const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
  if (!multisigAccount) return null;

  return multisigAccount.threshold;
});

const { $multisigDeposit } = createMultisigDeposit({
  $threshold: $multisigThreshold,
  $api: $api,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    network: $networkStore,
    transaction: $tx,
    route: $route,
    fee: $fee.map((fee) => fee?.toString()),
    multisigDeposit: $multisigDeposit,
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ network, transaction, selectedSignatory, fee }) => {
    return nonNullable(network) && nonNullable(transaction) && nonNullable(selectedSignatory) && nonNullable(fee);
  },
  fn: ({ network, transaction, selectedSignatory, multisigDeposit, route, fee }, formData) => {
    const { initiator, ...rest } = formData;
    const amount = formatAmount(rest.amount, network!.asset.precision);

    return {
      transaction,
      formData: {
        route,
        fee: fee!,
        totalFee: fee!,
        amount,
        multisigDeposit: multisigDeposit.toString(),
        initiator: initiator!,
        signatory: selectedSignatory!,
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: formSubmitted,
  source: $stakingResourceKey,
  filter: nonNullable,
  target: staking.stakingResource.stop,
});

export const formModel = {
  form,
  $signatories,
  $signingPath,
  $selectedSignatory: form.fields.signatory.$value,
  $route,

  $availableBalance,
  $proxyWallet,
  $proxyBalance,
  $unstakeBalanceRange,

  $fee,
  $pendingFee,
  $multisigDeposit,

  $isMultisig,
  $isProxy,
  $api,
  $coreTx,
  $networkStore,
  $tx,
  $isChainConnected,
  $isStakingLoading,
  $canSubmit,
  $errors,

  events: {
    formInitiated,
    signingPathChanged,
  },
  output: {
    formSubmitted,
  },
};
