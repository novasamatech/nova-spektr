import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import { type DelegateAccount } from '@/shared/api/governance';
import { type Asset, type Chain, type Conviction } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  formatAmount,
  getRelaychainAsset,
  nonNullable,
  nullable,
  transferableAmount,
  transferableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit, createSignatoriesStore } from '@/shared/transactions';
import { accounts } from '@/domains/network';
import { type AnyAccount } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { locksService } from '@/entities/governance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { createDraftModeBinding, wireDraftSourceBalance } from '@/features/drafts';
import { getLocksForAccount, networkSelectorModel } from '@/features/governance';
import { locksAggregate } from '@/features/governance/aggregates/locks';
import { createSigningPathModel } from '@/features/signing-path';
import { type DelegateData, type WalletData } from '../lib/types';

export const flowFinished = createEvent();

export const $target = createStore<DelegateAccount | null>(null).reset(flowFinished);
export const $tracks = createStore<number[]>([]).reset(flowFinished);

export const $delegateData = createStore<Omit<DelegateData, 'tracks' | 'target' | 'initiator'> | null>(null).reset(
  flowFinished,
);

type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  amount: string;
  conviction: Conviction;
  locks: Record<string, BN>;
};

const formInitiated = createEvent<WalletData & { shards: AnyAccount[] }>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();

const draftMode = createDraftModeBinding({ formInitiated, chainChanged: formInitiated });

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $chain = $networkStore.map((network) => network?.chain ?? null);

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
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (initiator, fields, { fee, isProxy, proxyBalance, network, initiatorBalance, isDraftMode }) => {
            if (isDraftMode) return;
            if (!initiator) {
              return { message: 'staking.bond.noInitiatorError' };
            }

            if (isProxy) {
              if (new BN(fee).gt(new BN(proxyBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            } else if (fields.amount) {
              const amountBN = new BN(formatAmount(fields.amount, network.asset.precision));
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
            multisigDeposit: $multisigDeposit,
            fee: $fee,
            hasAnyMultisig: $hasAnyMultisig,
            signatoryBalance: $signatoryBalance,
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (signatory, _fields, { multisigDeposit, fee, hasAnyMultisig, signatoryBalance, isDraftMode }) => {
            if (isDraftMode) return;
            if (nullable(signatory)) {
              return { message: 'transfer.noSignatoryError' };
            }

            const required = new BN(multisigDeposit).add(new BN(fee));
            if (hasAnyMultisig && required.gt(new BN(signatoryBalance))) {
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
            fee: $fee,
            hasAnyMultisig: $hasAnyMultisig,
            network: $networkStore,
            delegateBalanceRange: $delegateBalanceRange,
            initiatorBalance: $initiatorBalance,
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (
            value,
            fields,
            { fee, hasAnyMultisig, network, delegateBalanceRange, initiatorBalance, isDraftMode },
          ) => {
            if (!value) {
              return { message: 'transfer.requiredAmountError' };
            }

            if (value === ZERO_BALANCE) {
              return { message: 'transfer.notZeroAmountError' };
            }

            if (isDraftMode) return;

            const amountBN = new BN(formatAmount(value, network.asset.precision));
            const delegateBalance = Array.isArray(delegateBalanceRange)
              ? delegateBalanceRange[1]
              : delegateBalanceRange;

            if (amountBN.gt(new BN(delegateBalance))) {
              return { message: 'staking.notEnoughBalanceError' };
            }

            if (!hasAnyMultisig && fields.initiator) {
              if (amountBN.add(new BN(fee)).gt(new BN(initiatorBalance))) {
                return { message: 'transfer.notEnoughBalanceForFeeError' };
              }
            }
          },
        };
      },
    },
    conviction: {
      defaultValue: 'Locked1x',
    },
    locks: {
      defaultValue: {},
    },
  },
  validateOn: ['submit'],
});

const $walletData = combine({
  wallet: walletSelect.$selectedWallet,
  accounts: walletSelect.$selectedAccounts,
  chain: networkSelectorModel.$governanceChain,
});

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
  },
);

const $account = combine(
  {
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
    trackLocks: locksAggregate.$trackLocks,
  },
  ({ network, wallet, initiator, balances, trackLocks }) => {
    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    const lock = getLocksForAccount(initiator.accountId, trackLocks);

    return {
      account: initiator,
      balance: transferableAmountBN(balance),
      lock,
      available: balance ? locksService.getAvailableBalance(balance) : BN_ZERO,
    };
  },
);

// Source balance for draft mode: fetched on-demand once the path is set so
// the "Available:" row reflects the eventual signer's balance, not the
// connected wallet's initiator.
const $draftSourceBalance = wireDraftSourceBalance({
  $draftPath: draftMode.$draftSigningPath,
  $chain: $chain,
  $isDraftMode: draftMode.$isDraftMode,
});

const $initiatorBalance = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    draftSourceBalance: $draftSourceBalance,
    account: $account,
  },
  ({ isDraftMode, draftSourceBalance, account }) => {
    // Draft mode: read the path source's balance directly (no fee to subtract
    // — the eventual signer pays it at submit time).
    if (isDraftMode) {
      return draftSourceBalance ? locksService.getAvailableBalance(draftSourceBalance).toString() : ZERO_BALANCE;
    }
    return account?.available.toString() || ZERO_BALANCE;
  },
);

const $delegateBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === ZERO_BALANCE) return ZERO_BALANCE;

  return [ZERO_BALANCE, initiatorBalance];
});

const $coreTx = combine(
  {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    signatory: form.fields.signatory.$value,
    delegateData: $delegateData,
  },
  ({ walletData, target, tracks, signatory, delegateData }) => {
    if (!walletData.chain || !target || tracks.length === 0 || !signatory || !delegateData) return null;

    return transactionBuilder.buildDelegate({
      chain: walletData.chain,
      accountId: signatory.accountId,
      balance: (walletData.chain && formatAmount(delegateData.balance, walletData.chain.assets[0]!.precision)) || '0',
      conviction: delegateData.conviction || 'None',
      target: target.accountId,
      tracks,
    });
  },
);

const $signatories = createSignatoriesStore({
  chain: $chain,
  initiator: form.fields.initiator.$value,
  accounts: accounts.$list,
});

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
  chain: $chain,
  transaction: $coreTx,
  accounts: accounts.$list,
  initiator: form.fields.initiator.$value,
  signatory: form.fields.signatory.$value,
  routeOverride: $pathRoute,
});

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);
const $hasAnyMultisig = $route.map((route) => nonNullable(route.find(accountUtils.isAnyMultisigAccount)));
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

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

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
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

const $proxyWallet = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ isProxy, proxyAccount, wallets }) => {
    if (!isProxy || !proxyAccount) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $draftCoreTx = combine(
  {
    walletData: $walletData,
    target: $target,
    tracks: $tracks,
    delegateData: $delegateData,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ walletData, target, tracks, delegateData, path, isPathComplete }) => {
    if (!walletData.chain || !target || tracks.length === 0 || !delegateData || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    return transactionBuilder.buildDelegate({
      chain: walletData.chain,
      accountId: sourceAccountId,
      balance: (walletData.chain && formatAmount(delegateData.balance, walletData.chain.assets[0]!.precision)) || '0',
      conviction: delegateData.conviction || 'None',
      target: target.accountId,
      tracks,
    });
  },
);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isFormValid: form.$isValid,
    pendingFee: $pendingFee,
  },
  ({ isDraftMode, isFormValid, pendingFee }) => {
    if (isDraftMode) return false;
    return isFormValid && !pendingFee;
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
  source: 'governance-delegate-draft-mode',
  $callDataHex: $draftCallDataHex,
  $networkStore,
  $canSave: $canSaveAsDraft,
});

sample({
  clock: formInitiated,
  target: form.reset,
});

// Pre-select first signatory automatically
sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

sample({
  clock: formInitiated,
  filter: ({ chain, shards }) => nonNullable(getRelaychainAsset(chain.assets)) && shards.length > 0,
  fn: ({ chain, shards }) => ({
    networkStore: { chain, asset: getRelaychainAsset(chain.assets)! },
    initiator: shards[0],
  }),
  target: spread({
    initiator: form.fields.initiator.change,
    networkStore: $networkStore,
  }),
});

// Submit

sample({
  clock: form.$values.updates,
  source: { networkStore: $networkStore, account: $account },
  filter: ({ networkStore, account }) => nonNullable(networkStore) && nonNullable(account),
  fn: ({ account }, formData) => {
    const locks = account ? { [account.account.accountId]: account.lock } : {};

    return { ...formData, locks };
  },
  target: formChanged,
});

sample({
  clock: form.submit.doneData,
  target: formSubmitted,
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

  $account,
  $initiatorBalance,
  $delegateBalanceRange,
  $proxyBalance,

  $api,
  $networkStore,
  $hasAnyMultisig,
  $canSubmit,

  $fee,
  $pendingFee,
  $tx,
  $route,
  $multisigDeposit,

  $walletData,
  $coreTx,
  $proxyAccount,

  $isDraftMode: draftMode.$isDraftMode,
  $isDraftPathComplete: draftMode.$isDraftPathComplete,
  $canSaveAsDraft,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    formInitiated,
    formCleared,
    signingPathChanged,
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
  output: {
    formSubmitted,
    formChanged,
  },
};
