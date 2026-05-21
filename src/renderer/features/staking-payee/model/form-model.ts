import { combine, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Asset, type Chain, RewardsDestination } from '@/shared/core';
import { type Form, createForm } from '@/shared/forms';
import {
  ZERO_BALANCE,
  getRelaychainAsset,
  isStringsMatchQuery,
  nonNullable,
  nullable,
  toAddress,
  transferableAmount,
  validateAddress,
} from '@/shared/lib/utils';
import { createComplexTxStore, createSignatoriesStore, createTxValidationStore } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel, walletUtils } from '@/entities/wallet';
import { createDraftModeBinding, wireDraftSourceBalance } from '@/features/drafts';
import { payeeValidator } from '@/features/operations/OperationsValidation';
import { createSigningPathModel } from '@/features/signing-path';
import { type FormInput } from '../lib/types';

export type FormParams = {
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  destination: string;
};

const formInitiated = createEvent<FormInput>();
const formSubmitted = createEvent();
const formChanged = createEvent<FormParams>();
const formCleared = createEvent();
const destinationQueryChanged = createEvent<string>();
const destinationTypeChanged = createEvent<RewardsDestination>();

const draftMode = createDraftModeBinding({ formInitiated, chainChanged: formInitiated });

const $networkStore = createStore<{ chain: Chain; asset: Asset } | null>(null);
const $chain = $networkStore.map((network) => network?.chain ?? null);

const $destinationQuery = restore(destinationQueryChanged, '');
const $destinationType = restore(destinationTypeChanged, RewardsDestination.RESTAKE);

const multisigDepositChanged = createEvent<string>();
const $multisigDeposit = restore(multisigDepositChanged, ZERO_BALANCE);

const form: Form<FormParams> = createForm<FormParams>({
  fields: {
    initiator: {
      defaultValue: null,
      validator: () => (initiator) => {
        if (!initiator) {
          return { message: 'staking.bond.noAccountError' };
        }
      },
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
    destination: {
      defaultValue: '',
      validator: () => {
        return {
          source: $destinationType,
          fn: (value, _form: FormParams, destinationType: RewardsDestination) => {
            if (destinationType === RewardsDestination.RESTAKE) return;

            if (!validateAddress(value)) {
              return { message: 'proxy.addProxy.proxyAddressRequiredError' };
            }
          },
        };
      },
    },
  },
  validateOn: ['submit'],
});

// Computed

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

const $destinationAccounts = combine(
  {
    accounts: accounts.$list,
    network: $networkStore,
    query: $destinationQuery,
  },
  ({ accounts, network, query }) => {
    if (!network) return [];

    return accounts.filter((account) => {
      const hasPermission = accountService.hasPermissionToMakeActions(account);
      const isAvailableOnChain = accountService.isAccountAvailableOnChain(account, network.chain);
      const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });
      const matchesQuery = isStringsMatchQuery(query, [account.name, address]);

      return hasPermission && isAvailableOnChain && matchesQuery;
    });
  },
);

const $api = combine(
  {
    apis: networkModel.$apis,
    network: $networkStore,
  },
  ({ apis, network }) => {
    return network ? (apis[network.chain.chainId] ?? null) : null;
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
    initiator: form.fields.initiator.$value,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ isDraftMode, draftSourceBalance, balances, initiator, network }) => {
    // Draft mode: read the path source's balance directly (no fee to subtract
    // — the eventual signer pays it at submit time).
    if (isDraftMode) return transferableAmount(draftSourceBalance);

    if (!initiator || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      initiator.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $bondBalanceRange = combine($initiatorBalance, (initiatorBalance) => {
  if (!initiatorBalance || initiatorBalance === '0') return '0';

  return ['0', initiatorBalance];
});

const $coreTx = combine(
  {
    signatory: form.fields.signatory.$value,
    destination: form.fields.destination.$value,
    chain: $chain,
  },
  ({ signatory, destination, chain }) => {
    if (!signatory || !chain || !validateAddress(destination)) return null;

    return transactionBuilder.buildSetPayee({
      chain,
      accountId: signatory.accountId,
      destination,
    });
  },
);

const $draftCoreTx = combine(
  {
    chain: $chain,
    destination: form.fields.destination.$value,
    destinationType: $destinationType,
    path: draftMode.$draftSigningPath,
    isPathComplete: draftMode.$isDraftPathComplete,
  },
  ({ chain, destination, destinationType, path, isPathComplete }) => {
    if (!chain || !isPathComplete) return null;
    const sourceAccountId = path[0]?.accountId;
    if (!sourceAccountId) return null;

    if (destinationType === RewardsDestination.RESTAKE) {
      return transactionBuilder.buildSetPayee({
        chain,
        accountId: sourceAccountId,
        destination: toAddress(''),
      });
    }

    if (!validateAddress(destination)) return null;

    return transactionBuilder.buildSetPayee({
      chain,
      accountId: sourceAccountId,
      destination,
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

const $proxyAccount = $route.map((route) => route.find((account) => accountUtils.isProxiedAccount(account)) ?? null);
const $isProxy = $proxyAccount.map((account) => nonNullable(account));

const $multisigAccount = $route.map(
  (route) => route.find((account) => accountUtils.isAnyMultisigAccount(account)) ?? null,
);

const $isMultisig = $multisigAccount.map((account) => nonNullable(account));

// Transaction validation
const $asset = $networkStore.map((network) => network?.asset ?? null);
const { $errors, $valid } = createTxValidationStore({
  validator: payeeValidator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const $proxyWallet = combine(
  {
    proxyAccount: $proxyAccount,
    wallets: walletModel.$wallets,
  },
  ({ proxyAccount, wallets }) => {
    if (nullable(proxyAccount)) return null;

    return walletUtils.getWalletById(wallets, proxyAccount.walletId);
  },
);

const $proxyBalance = combine(
  {
    isProxy: $isProxy,
    proxyAccount: $proxyAccount,
    balances: balanceModel.$balanceMap,
    network: $networkStore,
  },
  ({ isProxy, proxyAccount, balances, network }) => {
    if (!isProxy || !proxyAccount || !network) return ZERO_BALANCE;

    const balance = balanceUtils.getBalance(
      balances,
      proxyAccount.accountId,
      network.chain.chainId,
      network.asset.assetId,
    );

    return transferableAmount(balance);
  },
);

const $draftCallDataHex = combine($draftCoreTx, $api, (tx, api) => transactionService.getCallDataHex(tx, api));

const $canSubmit = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    valid: $valid,
    formValid: form.$isValid,
    pendingFee: $pendingFee,
  },
  ({ isDraftMode, valid, formValid, pendingFee }) => {
    if (isDraftMode) return false;
    return valid && formValid && !pendingFee;
  },
);

const $canSaveAsDraft = combine(
  {
    isDraftMode: draftMode.$isDraftMode,
    isPathComplete: draftMode.$isDraftPathComplete,
    callData: $draftCallDataHex,
    networkStore: $networkStore,
    destination: form.fields.destination.$value,
    destinationType: $destinationType,
  },
  ({ isDraftMode, isPathComplete, callData, networkStore, destination, destinationType }) => {
    if (!isDraftMode || !isPathComplete || !callData || !networkStore) return false;
    if (destinationType !== RewardsDestination.RESTAKE && !validateAddress(destination)) return false;

    return true;
  },
);

draftMode.connectSave({
  source: 'staking-payee-draft-mode',
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
  clock: [$signatoryFromPath, $signatories, formInitiated],
  source: { fromPath: $signatoryFromPath, signatories: $signatories },
  fn: ({ fromPath, signatories }) => fromPath ?? signatories.at(0) ?? null,
  target: form.fields.signatory.change,
});

sample({ clock: form.fields.signatory.$value, target: recomputeForSigner });

// Submit

sample({
  clock: form.$values.updates,
  source: $networkStore,
  filter: (networkStore) => Boolean(networkStore),
  fn: (networkStore, formData) => {
    const destination = toAddress(formData.destination, { prefix: networkStore!.chain.addressPrefix });

    return { ...formData, destination };
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
  $destinationAccounts,
  $destinationQuery,
  $destinationType,

  $initiatorBalance,
  $bondBalanceRange,
  $proxyBalance,
  $proxyAccount,

  $tx,
  $coreTx,
  $route,
  $fee,
  $pendingFee,
  $multisigDeposit,

  $api,
  $networkStore,
  $isMultisig,
  $multisigAccount,
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
    destinationQueryChanged,
    destinationTypeChanged,
    multisigDepositChanged, // todo change it
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
