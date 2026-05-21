import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
  unlockingAmount,
} from '@/shared/lib/utils';
import { type ResourceRequestKey } from '@/shared/query';
import { createComplexTxStore, createSignatoriesStore, createTxValidationStore } from '@/shared/transactions';
import { type AnyAccount, accounts } from '@/domains/network';
import { staking, stakingService } from '@/domains/staking';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { createDraftModeBinding, wireDraftSourceBalance } from '@/features/drafts';
import { restakeValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { type NetworkStore } from '../lib/types';

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
};

type FormSubmitEvent = FormParams & {
  fee: string;
  totalFee: string;
  multisigDeposit: string;
};

const formInitiated = createEvent<NetworkStore>();
const formSubmitted = createEvent<FormSubmitEvent>();
const formCleared = createEvent();

const multisigDepositChanged = createEvent<string>();

// draft mode — wired through the shared factory in features/drafts
const draftMode = createDraftModeBinding({ formInitiated, chainChanged: formInitiated });

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $stakingResourceKey = createStore<ResourceRequestKey | null>(null);
const $minBond = createStore<string>(ZERO_BALANCE);

const $staking = combine(staking.stakingResource.$cache, $networkStore, (cache, network) =>
  network ? (cache[network.chain.chainId] ?? null) : null,
);

const $restakeBalanceRange = createStore<string | string[]>(ZERO_BALANCE);
const $proxyBalance = createStore<string>(ZERO_BALANCE);

const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const form: Form<FormParams> = createForm<FormParams>({
  validateOn: ['submit'],
  fields: {
    initiator: {
      defaultValue: null,
    },
    signatory: {
      defaultValue: null,
      validator: () => ({
        source: draftMode.$isDraftMode,
        fn: (signatory, _, isDraftMode) => {
          if (isDraftMode) return;
          if (nullable(signatory)) {
            return { message: 'transfer.noSignatoryError' };
          }
        },
      }),
    },
    amount: {
      defaultValue: '',
      validator: () => {
        return {
          source: combine({
            network: $networkStore,
            restakeBalanceRange: $restakeBalanceRange,
            availableBalance: $availableBalance,
            fee: $fee,
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (amount, _f, { network, restakeBalanceRange, availableBalance, fee, isDraftMode }) => {
            if (nullable(amount) || amount === '') {
              return { message: 'transfer.requiredAmountError' };
            }

            if (amount === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            // Draft mode skips fee/balance checks — the eventual signer pays.
            if (isDraftMode) return;

            const amountBN = new BN(formatAmount(amount, network.asset.precision));
            const restakeBalance = Array.isArray(restakeBalanceRange) ? restakeBalanceRange[1] : restakeBalanceRange;
            const isNotEnoughBalance = amountBN.gt(new BN(restakeBalance));
            if (isNotEnoughBalance) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            const isNotEnoughBalanceForFee = fee.gt(new BN(availableBalance.balance));
            if (isNotEnoughBalanceForFee) {
              return { message: 'transfer.notEnoughBalanceForFeeError' };
            }
          },
        };
      },
    },
  },
});

// Effects

const getMinNominatorBondFx = createEffect((api: ApiPromise): Promise<string> => {
  return stakingService.getMinNominatorBond(api);
});

// Computed

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
    if (nullable(network) || nullable(form.signatory) || !isConnected) return null;

    return transactionBuilder.buildRestake({
      chain: network.chain,
      asset: network.asset,
      accountId: form.signatory.accountId,
      amount: form.amount || ZERO_BALANCE,
    });
  },
);

// Draft-mode transaction: same call but built from the path's source instead
// of the wallet-signatory.
const $draftCoreTx = combine(
  {
    network: $networkStore,
    amount: form.fields.amount.$value,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ network, amount, path, isPathComplete }) => {
    if (nullable(network) || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    return transactionBuilder.buildRestake({
      chain: network.chain,
      asset: network.asset,
      accountId: sourceAccountId,
      amount: amount || ZERO_BALANCE,
    });
  },
);

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: form.fields.initiator.$value,
    chain: $chain,
    resetOn: formInitiated,
    resetUserOverrideOn: form.fields.initiator.change,
  },
);

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  accounts: accounts.$list,
  chain: $chain,
  transaction: $coreTx,
  routeOverride: $pathRoute,
});

const $realAccount = combine(
  {
    route: $route,
    initiator: form.fields.initiator.$value,
  },
  ({ route, initiator }) => {
    if (nullable(initiator)) return null;
    if (route.length === 0) return initiator;

    const multisigAccount = route.find(accountUtils.isAnyMultisigAccount);
    if (multisigAccount) {
      return multisigAccount;
    }

    const proxyAccount = route.find(accountUtils.isProxiedAccount);
    return proxyAccount ?? null;
  },
);

const $isMultisig = $route.map((route) => {
  return route.some((acc) => accountUtils.isAnyMultisigAccount(acc));
});

const $isProxy = $route.map((route) => {
  return route.some((acc) => accountUtils.isProxiedAccount(acc));
});

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    account: $realAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, account, wallets }) => {
    if (!isProxy || nullable(account)) return null;

    return walletUtils.getWalletById(wallets, account.walletId);
  },
);

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: restakeValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

// Source balance for draft mode: fetched on-demand once the path is set so
// the "Available:" row reflects the eventual signer's balance, not the
// connected wallet's initiator.
const $draftSourceBalance = wireDraftSourceBalance({
  $draftPath: draftMode.$draftSigningPath,
  $chain: $chain,
  $isDraftMode: draftMode.$isDraftMode,
});

const $availableBalance = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    draftSourceBalance: $draftSourceBalance,
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    staking: $staking,
    balances: balanceModel.$balanceMap,
  },
  ({ isDraftMode, draftSourceBalance, network, wallet, initiator, staking, balances }) => {
    // Draft mode: read the path source's balance directly (no fee to subtract
    // — the eventual signer pays it at submit time). Stake info isn't available
    // for non-wallet sources; only `balance` is read for the "Available:" row.
    if (isDraftMode) {
      return { balance: transferableAmount(draftSourceBalance), stake: ZERO_BALANCE };
    }

    if (nullable(wallet) || nullable(network) || nullable(staking) || nullable(initiator)) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    const activeStake = staking[initiator.accountId]?.active || ZERO_BALANCE;

    return { balance: transferableAmount(balance), stake: activeStake };
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

const $isStakingLoading = $staking.map((s) => s === null);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    valid: $valid,
    formValid: form.$isValid,
    pendingFee: $pendingFee,
    isStakingLoading: $isStakingLoading,
  },
  ({ isDraftMode, valid, formValid, pendingFee, isStakingLoading }) => {
    if (isDraftMode) return false; // draft uses its own save action
    return valid && formValid && !pendingFee && !isStakingLoading;
  },
);

const $canSaveAsDraft = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    networkStore: $networkStore,
    amount: form.fields.amount.$value,
  },
  ({ isDraftMode, isPathComplete, callData, networkStore, amount }) => {
    if (!isDraftMode || !isPathComplete || !callData || !networkStore) return false;
    if (!amount || amount === ZERO_BALANCE) return false;

    return true;
  },
);

draftMode.connectSave({
  source: 'staking-restake-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore,
  $canSave: $canSaveAsDraft,
});

// Fields connections

sample({
  clock: formInitiated,
  target: form.reset,
});

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => Boolean(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    initiator: shards[0],
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
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
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

sample({
  source: {
    staking: $staking,
    initiator: form.fields.initiator.$value,
  },
  filter: ({ staking }) => nonNullable(staking),
  fn: ({ staking, initiator }) => {
    if (nullable(initiator)) return ZERO_BALANCE;

    const unstakedBalance = unlockingAmount(staking![initiator.accountId]?.unlocking);

    return unstakedBalance === ZERO_BALANCE ? ZERO_BALANCE : [ZERO_BALANCE, unstakedBalance];
  },
  target: $restakeBalanceRange,
});

sample({
  clock: form.fields.initiator.change,
  target: form.fields.amount.reset,
});

sample({
  source: {
    isProxy: $isProxy,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
    proxyAccount: $realAccount,
  },
  filter: ({ isProxy, network, proxyAccount }) => {
    return isProxy && nonNullable(network) && nonNullable(proxyAccount);
  },
  fn: ({ balances, network, proxyAccount }) => {
    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount!.accountId,
      network!.chain.chainId,
      network!.asset.assetId,
    );

    return transferableAmount(balance);
  },
  target: $proxyBalance,
});

// Submit

sample({
  clock: form.submit.doneData,
  source: {
    network: $networkStore,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
  },
  filter: ({ network, fee }) => nonNullable(network) && nonNullable(fee),
  fn: ({ network, fee, multisigDeposit }, formData) => {
    const amount = formatAmount(formData.amount, network!.asset.precision);

    return {
      fee: fee!.toString(),
      totalFee: fee!.toString(),
      multisigDeposit,
      ...formData,
      amount,
    };
  },
  target: formSubmitted,
});

sample({
  clock: [formSubmitted, formCleared],
  source: $stakingResourceKey,
  filter: nonNullable,
  target: staking.stakingResource.stop,
});

sample({
  clock: formCleared,
  target: form.reset,
});

export const formModel = {
  form,

  $proxyWallet,
  $signatories,
  $signingPath,
  $coreTx,
  $route,
  $restakeBalanceRange,
  $proxyBalance,

  $fee,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $tx,
  $isMultisig,
  $isChainConnected,
  $isStakingLoading,
  $canSubmit,
  $errors,

  $isDraftMode: draftMode.$isDraftMode,
  $isDraftPathComplete: draftMode.$isDraftPathComplete,
  $canSaveAsDraft,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    formInitiated,
    formCleared,
    multisigDepositChanged,
    signingPathChanged,
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
  output: {
    formSubmitted,
  },
};
