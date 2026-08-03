import { BN } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getRelaychainAsset,
  nonNullable,
  nullable,
  reservableAmountBN,
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
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { createDraftModeBinding, wireDraftSourceBalance } from '@/features/drafts';
import { createSigningPathModel } from '@/features/signing-path';
import { validatorSelectionModel } from '@/features/validator-selection';
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

const draftMode = createDraftModeBinding({ formInitiated, chainChanged: formInitiated });

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);

const $chain = $networkStore.map((network) => network?.chain ?? null);

const $validators = restore(validatorSelectionModel.output.formSubmitted, []);

const form: Form<FormParams> = createForm<FormParams>({
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
          if (!signatory) {
            return { message: 'proxy.addProxy.noSignatoryError' };
          }
        },
      }),
    },
    amount: {
      defaultValue: null,
      validator: () => {
        return {
          source: combine({
            fee: $fee,
            availableBalance: $availableBalance,
            isDraftMode: draftMode.$isDraftMode,
          }),
          fn: (_a, _f, { fee, availableBalance, isDraftMode }) => {
            if (isDraftMode) return;
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

// Source balance for draft mode: fetched on-demand once the path is set so
// the "Available:" row reflects the eventual signer's balance, not the
// connected wallet's initiator.
const $draftSourceBalance = wireDraftSourceBalance({
  $draftPath: draftMode.$draftSigningPath,
  $chain: $chain,
  $isDraftMode: draftMode.$isDraftMode,
});

// Computed
const $availableBalance = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    draftSourceBalance: $draftSourceBalance,
    network: $networkStore,
    wallet: walletSelect.$selectedWallet,
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
  },
  ({ isDraftMode, draftSourceBalance, network, wallet, initiator, balances }) => {
    // Draft mode: read the path source's balance directly (no fee to subtract
    // — the eventual signer pays it at submit time).
    if (isDraftMode) return draftSourceBalance ? reservableAmountBN(draftSourceBalance) : null;

    if (!wallet || !network || !initiator) return null;

    const { chain, asset } = network;

    const balance = balanceUtils.getBalance(balances, initiator.accountId, chain.chainId, asset.assetId);
    if (nullable(balance)) return null;

    return reservableAmountBN(balance);
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

const { $signingPath, signingPathChanged, $signatoryFromPath, recomputeForSigner, $pathRoute } = createSigningPathModel(
  {
    initiator: form.fields.initiator.$value,
    chain: $chain,
    resetOn: formInitiated,
    resetUserOverrideOn: form.fields.initiator.change,
  },
);

sample({
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

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

const $draftCoreTx = combine(
  {
    network: $networkStore,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
    validators: $validators,
  },
  ({ network, path, isPathComplete, validators }) => {
    if (nullable(network) || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    return transactionBuilder.buildNominate({
      chain: network.chain,
      accountId: sourceAccountId,
      nominators: validators.map(({ accountId }) => accountId),
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
  routeOverride: $pathRoute,
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
const { $errors, $valid } = createTxValidationStore({
  validator: nominateTxValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    valid: $valid,
    formValid: form.$isValid,
    pendingFee: $pendingFee,
    draftPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ isDraftMode, valid, formValid, pendingFee, draftPathComplete }) => {
    if (isDraftMode) {
      return draftPathComplete;
    }
    return valid && formValid && !pendingFee;
  },
);

const $canSaveAsDraft = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    networkStore: $networkStore,
    validators: $validators,
  },
  ({ isDraftMode, isPathComplete, callData, networkStore, validators }) => {
    if (!isDraftMode || !isPathComplete || !callData || !networkStore) return false;
    if (validators.length === 0) return false;

    return true;
  },
);

draftMode.connectSave({
  source: 'staking-nominate-draft-mode',
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

// Submit
sample({
  clock: form.submit.doneData,
  source: {
    network: $networkStore,
    route: $route,
    signingPath: $signingPath,
    fee: $fee.map((fee) => fee?.toString()),
    multisigDeposit: $multisigDeposit,
    selectedSignatory: form.fields.signatory.$value,
  },
  filter: ({ network, selectedSignatory, fee }) => {
    return nonNullable(network) && nonNullable(selectedSignatory) && nonNullable(fee);
  },
  fn: ({ selectedSignatory, network, fee, multisigDeposit, signingPath, ...rest }, formData) => {
    const { initiator } = formData;

    return {
      ...rest,
      multisigDeposit: multisigDeposit.toString(),
      fee: fee!.toString(),
      totalFee: fee!.toString(),
      chain: network!.chain,
      initiator: initiator!,
      signatory: selectedSignatory!,
      signingPath,
    };
  },
  target: formSubmitted,
});

export const formModel = {
  form,
  $signatories,
  $signingPath,
  $pathRoute,
  $selectedSignatory: form.fields.signatory.$value,

  $proxyWallet,
  $proxyBalance,

  $fee: $fee,
  $pendingFee,
  $multisigDeposit,

  $isMultisig,
  $isProxy,
  $api,
  $coreTx,
  $networkStore,
  $tx,
  $canSubmit,
  $errors,

  formInitiated,
  formSubmitted,
  signingPathChanged,

  $isDraftMode: draftMode.$isDraftMode,
  $isDraftPathComplete: draftMode.$isDraftPathComplete,
  $canSaveAsDraft,
  $initiatedDraft: draftMode.$initiatedDraft,
  $draftSigningPath: draftMode.$draftSigningPath,

  events: {
    toggleDraftMode: draftMode.draftModeToggled,
    saveAsDraftRequested: draftMode.saveAsDraftRequested,
    draftPathCommitted: draftMode.draftPathCommitted,
    draftPathEditStarted: draftMode.draftPathEditStarted,
    draftPathEditEnded: draftMode.draftPathEditEnded,
  },
};
