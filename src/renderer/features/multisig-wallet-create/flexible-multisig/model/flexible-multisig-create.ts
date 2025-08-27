import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { delay, or, spread } from 'patronum';

import { balanceService } from '@/shared/api/balances';
import { proxyService } from '@/shared/api/proxy';
import { type Asset, type Contact, type Transaction, type Wallet } from '@/shared/core';
import {
  Step,
  TEST_ACCOUNTS,
  getNativeAsset,
  nonNullable,
  nullable,
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import {
  createComplexTxStore,
  createFeeCalculator,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
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
const signerSelected = createEvent<AnyAccount>();

const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flow.close);

const $existentialDeposit = createStore(BN_ZERO).reset(flow.close);
const $error = createStore('').reset(flow.close);

const $signer = restore(signerSelected, null).reset(flow.close);

const $initiator = createStore<AnyAccount | null>(null).reset(flow.close);
const $initiatorWallet = createStore<Wallet | null>(null).reset(flow.close);

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

// in the current implementation, the first signatory is always the signer
sample({
  clock: $signatories,
  fn: signatories => (signatories.length >= 1 ? signatories[0] : null),
  target: $signer,
});

sample({
  clock: $initiatorWallet,
  source: { accounts: accounts.$list, chain: formModel.$chain },
  filter: ({ chain }) => nonNullable(chain),
  fn: ({ accounts, chain }, wallet) => {
    if (!wallet) return null;

    return accounts.find(a => a.walletId === wallet!.id && accountService.isAccountAvailableOnChain(a, chain!)) ?? null;
  },
  target: $initiator,
});

sample({
  clock: $initiatorWallet,
  filter: nonNullable,
  fn: wallet => [wallet!],
  target: signatoryModel.events.getSignatoriesBalance,
});

const $asset = formModel.$chain.map(chain => (chain ? getNativeAsset(chain.assets) : null));

type GetDepositParams = {
  api: ApiPromise;
  asset: Asset;
};

const getExistentialDepositFx = createEffect(async ({ api, asset }: GetDepositParams): Promise<BN> => {
  const existentialDeposit = await balanceService.getExistentialDeposit(api, asset);

  return existentialDeposit;
});

sample({
  clock: $api,
  source: $asset,
  filter: (asset, api) => nonNullable(api) && nonNullable(asset),
  fn: (asset, api) => ({ api: api!, asset: asset! }),
  target: getExistentialDepositFx,
});

sample({
  clock: getExistentialDepositFx.doneData,
  target: $existentialDeposit,
});

const $proxyDeposit = combine($api, api => (api && proxyService.getProxyDeposit(api, '0', 1)) ?? null);

const $totalDeposit = combine($existentialDeposit, $proxyDeposit, (existentialDeposit, proxyDeposit) => {
  if (nullable(proxyDeposit)) return null;

  return existentialDeposit.add(new BN(proxyDeposit));
});

// Transactions
const $coreTx = combine(
  {
    chain: formModel.$chain,
    account: $signer,
  },
  ({ chain, account }) => {
    if (!account || !chain) return null;

    return transactionBuilder.buildCreatePureProxy({
      chain: chain,
      accountId: account.accountId,
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

const $fakeFinalTx = combine(
  {
    chain: formModel.$chain,
    isConnected: formModel.$isChainConnected,
    api: $api,
    signatories: signatoryModel.$signatories,
    threshold: formModel.form.fields.threshold.$value,
    totalDeposit: $totalDeposit,
    signer: $signer,
  },
  ({ isConnected, chain, api, signatories, threshold, totalDeposit, signer }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;

    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      chain,
      signerAccountId: signer?.accountId || TEST_ACCOUNTS[0],
      signatories: signatoriesWrapped,
      multisigAccountId: TEST_ACCOUNTS[0],
      threshold: threshold || 2,
      proxyAccountId: TEST_ACCOUNTS[1],
      proxyDeposit: totalDeposit?.toString() || '0',
    });
  },
);

const $fakeProxyExtrinsic = combine($api, $fakeProxyTx, (api, tx) => {
  if (nullable(api)) return null;
  if (nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $proxyFee, $pending: $pendingProxyFee } = createFeeCalculator({
  extrinsic: $fakeProxyExtrinsic,
});

const $fakeFinalExtrinsic = combine($api, $fakeFinalTx, (api, tx) => {
  if (nullable(api)) return null;
  if (nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $multisigFee, $pending: $pendingMultisigFee } = createFeeCalculator({
  extrinsic: $fakeFinalExtrinsic,
});

const $fee = combine($proxyFee, $multisigFee, (proxyFee, multisigFee) => multisigFee.add(proxyFee));

const { $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: $initiator,
  signatory: $signer,
  accounts: accounts.$list,
  chain: formModel.$chain,
  transaction: $coreTx,
});

const validator = createTxValidator();
const { $errors: $firstErrors } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const { $errors: $secondErrors } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $fakeFinalTx,
  },
});

const $signerBalance = combine(
  {
    signer: $signer,
    balances: balanceModel.$balanceMap,
    chain: formModel.$chain,
  },
  ({ signer, balances, chain }) => {
    if (!signer || !chain) return null;
    const asset = getNativeAsset(chain.assets);

    return balanceUtils.getBalance(balances, signer.accountId, chain.chainId, asset.assetId) ?? null;
  },
);

const $isEnoughBalance = combine(
  {
    fee: $fee,
    totalDeposit: $totalDeposit,
    signerBalance: $signerBalance,
  },
  ({ fee, totalDeposit, signerBalance }) => {
    if (nullable(signerBalance) || nullable(totalDeposit)) return false;

    return fee.add(totalDeposit).lte(withdrawableAmountBN(signerBalance));
  },
);

const formSubmitted = sample({
  clock: formModel.form.validate,
  source: {
    tx: $tx,
    coreTx: $coreTx,
    route: $route,
    initiator: $initiator,
    signatory: $signer,
    chain: formModel.$chain,
  },
}).filterMap(({ chain, tx, coreTx, route, initiator, signatory }) => {
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
    tx: $tx,
    initiator: $initiator,
    signer: $signer,
  },
  filter: ({ chain, tx, initiator, signer }) =>
    nonNullable(chain) && nonNullable(tx) && nonNullable(initiator) && nonNullable(signer),
  fn: ({ chain, tx, initiator, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          transaction: tx!,
          signatory: signer,
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
  source: $tx,
  filter: tx => nonNullable(tx),
  fn: (_, payload) => ({ event: payload, step: Step.SUBMIT }),
  target: spread({
    event: submitModel.init,
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
    const signatoriesWithoutSigner = signatories.slice(1);
    const filtredSignatories = signatoriesWithoutSigner.filter(s => !s.walletId);

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
  $signer,
  $initiatorWallet,
  $signerBalance,
  $asset,

  $errors: combine($firstErrors, $secondErrors, (first, second) => [...first, ...second]),
  $fee,
  $proxyDeposit,
  $existentialDeposit,
  $totalDeposit,
  $isLoading: or($pendingProxyFee, $pendingMultisigFee, getExistentialDepositFx.pending),
  $isEnoughBalance,

  signerSelected,
  stepChanged,

  _test: {
    formSubmitted,
  },
  flow,
};
