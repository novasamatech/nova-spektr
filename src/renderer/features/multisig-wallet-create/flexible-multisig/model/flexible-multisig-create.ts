import { type ApiPromise } from '@polkadot/api';
import { type BN, BN_ZERO } from '@polkadot/util';
import { combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { and, delay, or, spread } from 'patronum';

import { balanceService as deprecatedBalanceService } from '@/shared/api/balances';
import { proxyService } from '@/shared/api/proxy';
import { type Asset, type Chain, type Contact, type Transaction, type Wallet } from '@/shared/core';
import { createStoreFromEffect } from '@/shared/effector';
import { Step, TEST_ACCOUNTS, getNativeAsset, nonNullable, nullable, toAccountId } from '@/shared/lib/utils';
import {
  createFeeCalculator,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts, balanceService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { flexibleMultisigFeature } from './feature';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const $api = combine(flexibleMultisigFeature.state, (state): ApiPromise | null => {
  if (state.status !== 'running') return null;
  return state.data.api;
});

const flow = createGate();

const stepChanged = createEvent<Step>();

const $asset = formModel.$chain.map(chain => (chain ? getNativeAsset(chain.assets) : null));

const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flow.close);

const $error = createStore('').reset(flow.close);

// working with accounts

const signatorySelected = createEvent<AnyAccount>();

const $signatory = restore(signatorySelected, null).reset(flow.close);

const $initiator = createStore<AnyAccount | null>(null).reset(flow.close);
const $initiatorWallet = createStore<Wallet | null>(null).reset(flow.close);

const $route = $signatory.map(s => (s ? [s] : []));

sample({
  clock: signatoryModel.$ownedSignatoriesWallets,
  source: signatoryModel.$signatories,
  fn: (signatories, wallets) => {
    const ownSignatory = signatories.at(0);
    if (wallets.length === 0 || !ownSignatory || !ownSignatory.walletId) return null;

    return wallets.find(w => w.id.toString() === ownSignatory.walletId) ?? null;
  },
  target: $initiatorWallet,
});

const $signatories = createSignatoriesStore({
  chain: formModel.$chain,
  initiator: $initiator,
  accounts: accounts.$list,
});

// in the current implementation, the first signatory is always the signatory
sample({
  clock: $signatories,
  fn: signatories => (signatories.length >= 1 ? signatories[0]! : null),
  target: $signatory,
});

sample({
  clock: $initiatorWallet,
  source: { accounts: accounts.$list, chain: formModel.$chain },
  fn: ({ accounts, chain }, wallet) => {
    if (!wallet || !chain) return null;

    return accounts.find(a => a.walletId === wallet!.id && accountService.isAccountAvailableOnChain(a, chain)) ?? null;
  },
  target: $initiator,
});

sample({
  clock: $initiatorWallet,
  filter: nonNullable,
  fn: wallet => [wallet!],
  target: signatoryModel.events.getSignatoriesBalance,
});

const $signatoryBalance = combine(
  {
    signatory: $signatory,
    balances: balanceModel.$balanceMap,
    chain: formModel.$chain,
  },
  ({ signatory, balances, chain }) => {
    if (nullable(signatory) || nullable(chain)) return null;
    const asset = getNativeAsset(chain.assets);

    return balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId) ?? null;
  },
);

// deposits

const { $: $existentialDeposit, $pending: $existentialDepositPending } = createStoreFromEffect<
  { api: ApiPromise; asset: Asset },
  BN
>({
  params: {
    api: $api,
    asset: $asset,
  },
  defaultValue: BN_ZERO,
  fn: ({ api, asset }) => deprecatedBalanceService.getExistentialDeposit(api, asset),
});

const $pureProxyDeposit = $api.map(api => {
  if (nullable(api)) return null;
  return proxyService.getPureProxyDeposit(api);
});

const $proxyReassignDeposit = combine($api, $pureProxyDeposit, (api, pureProxyDeposit) => {
  if (nullable(api) || nullable(pureProxyDeposit)) return null;
  return proxyService.getProxyDepositDelta(api, pureProxyDeposit.toString(), 2);
});

const $totalProxyDeposit = combine(
  {
    pureProxyDeposit: $pureProxyDeposit,
    proxyReassignDeposit: $proxyReassignDeposit,
  },
  ({ pureProxyDeposit, proxyReassignDeposit }) => {
    return (pureProxyDeposit ?? BN_ZERO).add(proxyReassignDeposit ?? BN_ZERO);
  },
);

const $totalDeposit = combine(
  {
    existentialDeposit: $existentialDeposit,
    totalProxyDeposit: $totalProxyDeposit,
  },
  ({ existentialDeposit, totalProxyDeposit }) => existentialDeposit.add(totalProxyDeposit),
);

const $pureTopUpAmount = combine(
  {
    existentialDeposit: $existentialDeposit,
    proxyReassignDeposit: $proxyReassignDeposit,
  },
  ({ existentialDeposit, proxyReassignDeposit }) => existentialDeposit.add(proxyReassignDeposit ?? BN_ZERO),
);

// transactions

const $createPureProxyTx = combine(
  {
    chain: formModel.$chain,
    signatory: $signatory,
  },
  ({ chain, signatory }) => {
    if (!signatory || !chain) return null;

    return transactionBuilder.buildCreatePureProxy({
      chain: chain,
      accountId: signatory.accountId,
    });
  },
);

const $fakeProxyTx = combine(
  {
    chain: formModel.$chain,
    isConnected: formModel.$isChainConnected,
    api: $api,
  },
  ({ isConnected, chain, api }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;

    return transactionBuilder.buildCreatePureProxy({
      chain: chain,
      accountId: TEST_ACCOUNTS[0],
    });
  },
);

const $reassignFakeTx = combine(
  {
    chain: formModel.$chain,
    isConnected: formModel.$isChainConnected,
    api: $api,
    signatories: signatoryModel.$signatories,
    threshold: formModel.form.fields.threshold.$value,
    pureTopUpAmount: $pureTopUpAmount,
    signatory: $signatory,
  },
  ({ isConnected, chain, api, signatories, threshold, pureTopUpAmount, signatory }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;

    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      chain,
      signatoryAccountId: signatory?.accountId || TEST_ACCOUNTS[0],
      signatories: signatoriesWrapped,
      multisigAccountId: TEST_ACCOUNTS[0],
      threshold: threshold || 2,
      proxyAccountId: TEST_ACCOUNTS[1],
      proxyType: 'Any',
      pureTopUpAmount,
    });
  },
);

// fee

const $fakeProxyExtrinsic = combine($api, $fakeProxyTx, (api, tx) => {
  if (nullable(api)) return null;
  if (nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $proxyFee, $pending: $pendingProxyFee } = createFeeCalculator({
  extrinsic: $fakeProxyExtrinsic,
});

const $fakeFinalExtrinsic = combine($api, $reassignFakeTx, (api, tx) => {
  if (nullable(api)) return null;
  if (nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $multisigFee, $pending: $pendingMultisigFee } = createFeeCalculator({
  extrinsic: $fakeFinalExtrinsic,
});

const $fee = combine(
  $proxyFee,
  $multisigFee,
  (proxyFee, multisigFee) => multisigFee && proxyFee && multisigFee.add(proxyFee),
);

// validation

const createPureProxyValidator = createTxValidator<{ chain: Chain; pureProxyDeposit: BN }>({
  additionalBalanceRules: [
    ({ route, getBalance, asset, chain, pureProxyDeposit }) => {
      const initiator = accountService.findInitiator(route);
      if (nullable(initiator)) return;

      const balance = getBalance(initiator.accountId, chain.chainId, asset.assetId);
      if (nullable(balance)) return;

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, pureProxyDeposit, 'legacy'),
        asset: asset,
        action: 'proxy deposit',
      };
    },
  ],
});

const {
  $errors: $createPureProxyValidationErrors,
  $balanceValidationResults: $createPureProxyBalancesResults,
  $valid: $createPureProxyValid,
} = createTxValidationStore({
  validator: createPureProxyValidator,
  params: {
    api: $api,
    asset: $asset,
    chain: formModel.$chain,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $createPureProxyTx,
    pureProxyDeposit: $pureProxyDeposit,
  },
});

const reassignProxyValidator = createTxValidator<{ chain: Chain; proxyDeposit: BN }>({
  additionalBalanceRules: [
    ({ route, getBalance, asset, chain, proxyDeposit }) => {
      const initiator = accountService.findInitiator(route);
      if (nullable(initiator)) return;

      const balance = getBalance(initiator.accountId, chain.chainId, asset.assetId);
      if (nullable(balance)) return;

      return {
        account: initiator,
        balance: balanceService.tryReserve(balance, proxyDeposit, 'legacy'),
        asset: asset,
        action: 'proxy deposit',
      };
    },
  ],
});
const { $errors: $reassignProxyValidationResults, $valid: $reassignProxyValid } = createTxValidationStore({
  validator: reassignProxyValidator,
  params: {
    balanceValidationResults: $createPureProxyBalancesResults,
    api: $api,
    chain: formModel.$chain,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $reassignFakeTx,
    proxyDeposit: $proxyReassignDeposit,
  },
});

const $errors = combine($createPureProxyValidationErrors, $reassignProxyValidationResults, (e1, e2) => e1.concat(e2));

const $validated = and($createPureProxyValid, $reassignProxyValid);

// actual flow

const formSubmitted = sample({
  clock: formModel.form.validate,
  source: {
    tx: $createPureProxyTx,
    coreTx: $createPureProxyTx,
    initiator: $initiator,
    signatory: $signatory,
    route: $route,
    chain: formModel.$chain,
  },
}).filterMap(({ chain, tx, coreTx, initiator, route, signatory }) => {
  if (
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(initiator) &&
    nonNullable(signatory) &&
    nonNullable(tx)
  ) {
    return [
      {
        tx,
        coreTx,
        route,
        signatory,
        initiator,
        chain,
      },
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: event => {
    return {
      event,
      step: Step.CONFIRM,
    };
  },
  target: spread({
    event: confirmModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.startSigningProxy,
  source: {
    chain: formModel.$chain,
    tx: $createPureProxyTx,
    initiator: $initiator,
    signatory: $signatory,
  },
  filter: ({ chain, tx, initiator, signatory }) =>
    nonNullable(chain) && nonNullable(tx) && nonNullable(initiator) && nonNullable(signatory),
  fn: ({ chain, tx, initiator, signatory }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          transaction: tx!,
          signatory: signatory,
        },
      ],
    },
    step: Step.SIGN,
  }),
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: signModel.signed,
  source: $createPureProxyTx,
  filter: tx => nonNullable(tx),
  fn: (_, payload) => ({ submit: payload, step: Step.SUBMIT }),
  target: spread({
    submit: submitModel.init,
    step: stepChanged,
  }),
});

// Contacts
sample({
  clock: signModel.signed,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const signatoriesWithoutsignatory = signatories.slice(1);
    const filtredSignatories = signatoriesWithoutsignatory.filter(s => !s.walletId);

    const contactMap = new Map(contacts.map(c => [c.accountId, c]));
    const updatedContacts: Contact[] = [];

    for (const { address, name } of filtredSignatories) {
      const contact = contactMap.get(toAccountId(address));

      if (!contact) continue;

      updatedContacts.push({
        ...contact,
        name,
      });
    }

    return updatedContacts;
  },
  target: contactModel.effects.updateContactsFx,
});

sample({
  clock: signModel.signed,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const contactsSet = new Set(contacts.map(c => c.accountId));

    return signatories
      .slice(1)
      .filter(signatory => !signatory.walletId && !contactsSet.has(toAccountId(signatory.address)))
      .map(
        ({ address, name }) =>
          ({
            address: address,
            name: name,
            accountId: toAccountId(address),
          }) as Contact,
      );
  },
  target: contactModel.effects.createContactsFx,
});

sample({
  clock: walletModel.restoreWallets.doneData,
  fn: data => data.at(0)?.id ?? null,
  target: walletSelect.select,
});

sample({
  clock: walletModel.restoreWallets.done,
  target: flow.close,
});

sample({
  clock: flexibleMultisigFeature.stopped,
  target: [formModel.form.reset, signatoryModel.$signatories.reinit],
});

sample({
  clock: delay(flow.close, 2000),
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

export const flexibleMultisigModel = {
  $error,
  $step,
  $api,
  $initiator,
  $signatory: $signatory,
  $initiatorWallet,
  $signatoryBalance,
  $asset,

  $errors,
  $validated,
  $fee,
  $proxyDeposit: $totalProxyDeposit,
  $existentialDeposit,
  $totalDeposit,
  $pureTopUpAmount,
  $isLoading: or($pendingProxyFee, $pendingMultisigFee, $existentialDepositPending),

  signatorySelected: signatorySelected,
  stepChanged,

  _test: {
    formSubmitted,
  },
  flow,
};
