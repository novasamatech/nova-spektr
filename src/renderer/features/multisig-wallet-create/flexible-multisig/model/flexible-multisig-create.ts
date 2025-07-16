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
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createFeeCalculator } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { flexibleMultisigFeature } from './feature';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';
import { walletProviderModel } from './wallet-provider-model';

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
const $signerWallet = createStore<Wallet | null>(null).reset(flow.close);

sample({
  clock: signatoryModel.$ownedSignatoriesWallets,
  source: signatoryModel.$signatories,
  fn: (signatories, wallets) => {
    const ownSignatory = signatories.at(0);
    if (wallets.length === 0 || !ownSignatory || !ownSignatory.walletId) return null;

    return wallets.find(w => w.id.toString() === ownSignatory.walletId) ?? null;
  },
  target: $signerWallet,
});

sample({
  clock: $signerWallet,
  source: { accounts: accounts.$list, chain: formModel.$chain },
  filter: ({ chain }) => nonNullable(chain),
  fn: ({ accounts, chain }, wallet) => {
    if (!wallet) return null;

    return accounts.find(a => a.walletId === wallet!.id && accountService.isAccountAvailableOnChain(a, chain!)) ?? null;
  },
  target: $signer,
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

const $proxyDeposit = combine($api, api => (api && proxyService.getProxyDeposit(api, '0', 1)) || '0');

const $totalDeposit = combine($existentialDeposit, $proxyDeposit, (existentialDeposit, proxyDeposit) => {
  if (!existentialDeposit) return null;

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

const $fakeWithProxy = combine(
  {
    chain: formModel.$chain,
    isConnected: formModel.$isChainConnected,
    api: $api,
    coreTx: $coreTx,
  },
  ({ isConnected, chain, api, coreTx }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;
    if (coreTx) return coreTx;

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
    signer: $signer,
    threshold: formModel.form.fields.threshold.$value,
    totalDeposit: $totalDeposit,
  },
  ({ isConnected, chain, api, signatories, threshold, totalDeposit }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;

    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      chain,
      signerAccountId: TEST_ACCOUNTS[0],
      signatories: signatoriesWrapped,
      multisigAccountId: TEST_ACCOUNTS[0],
      threshold: threshold || 2,
      proxyAccountId: TEST_ACCOUNTS[1],
      proxyDeposit: totalDeposit?.toString() ?? '0',
    });
  },
);

const { $: $proxyFee, $pending: $pendingProxyFee } = createFeeCalculator({
  $api: $api,
  $transaction: $fakeWithProxy,
});

const { $: $multisigFee, $pending: $pendingMultisigFee } = createFeeCalculator({
  $api: $api,
  $transaction: $fakeFinalTx,
});

const $fee = combine($proxyFee, $multisigFee, (proxyFee, multisigFee) => multisigFee.add(proxyFee));

const $pendingFee = combine(
  $pendingProxyFee,
  $pendingMultisigFee,
  (pendingProxyFee, pendingMultisigFee) => pendingProxyFee && pendingMultisigFee,
);

const { $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: $signer,
  signatory: $signer,
  accounts: accounts.$list,
  chain: formModel.$chain,
  transaction: $fakeWithProxy,
});

const $signerBalance = combine(
  {
    signer: $signer,
    balances: balanceModel.$balances,
    chain: formModel.$chain,
  },
  ({ signer, balances, chain }) => {
    if (!signer || !chain) return null;
    const asset = getNativeAsset(chain.assets);

    return balanceUtils.getBalance(balances, signer.accountId, chain.chainId, asset.assetId.toString()) ?? null;
  },
);

const $isEnoughBalance = combine(
  {
    fee: $fee,
    totalDeposit: $totalDeposit,
    signerBalance: $signerBalance,
  },
  ({ fee, totalDeposit, signerBalance }) => {
    if (!signerBalance || !fee || !totalDeposit) return false;

    return new BN(fee).add(new BN(totalDeposit)).lte(withdrawableAmountBN(signerBalance));
  },
);

const formSubmitted = sample({
  clock: formModel.form.validate,
  source: {
    tx: $tx,
    coreTx: $coreTx,
    route: $route,
    signer: $signer,
    chain: formModel.$chain,
    threshold: formModel.form.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
    totalDeposit: $totalDeposit,
  },
}).filterMap(({ chain, tx, coreTx, route, signer, threshold, totalDeposit, multisigAccountId }) => {
  if (
    nonNullable(totalDeposit) &&
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(signer) &&
    nonNullable(tx) &&
    nonNullable(multisigAccountId)
  ) {
    return [
      {
        tx,
        coreTx,
        route,
        signatory: signer,
        initiator: signer,
        threshold,
        totalDeposit: totalDeposit.toString(),
        chain,
        multisigAccountId,
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
    signer: $signer,
  },
  filter: ({ chain, tx, signer }) => nonNullable(chain) && nonNullable(tx) && nonNullable(signer),
  fn: ({ chain, tx, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: signer!,
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
  clock: signModel.output.formSubmitted,
  source: {
    chain: formModel.$chain,
    coreTx: $coreTx,
    tx: $tx,
    signer: $signer,
  },
  filter: ({ chain, coreTx, tx, signer }) => {
    return nonNullable(chain) && nonNullable(tx) && nonNullable(coreTx) && nonNullable(signer);
  },
  fn: ({ coreTx, tx, chain, signer }, signParams) => {
    return {
      event: {
        ...signParams,
        chain: chain!,
        account: signer!,
        coreTxs: [coreTx!],
        wrappedTxs: [tx!],
      },
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

// Contacts
sample({
  clock: signModel.output.formSubmitted,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const signatoriesWithoutSigner = signatories.slice(1);
    const contactMap = new Map(contacts.map(c => [c.accountId, c]));
    const updatedContacts: Contact[] = [];

    for (const { address, name } of signatoriesWithoutSigner) {
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
  clock: signModel.output.formSubmitted,
  source: {
    signatories: signatoryModel.$signatories,
    contacts: contactModel.$contacts,
  },
  fn: ({ signatories, contacts }) => {
    const contactsSet = new Set(contacts.map(c => c.accountId));

    return signatories
      .slice(1)
      .filter(signatory => !contactsSet.has(toAccountId(signatory.address)))
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
  clock: walletModel.events.walletRestoredSuccess,
  target: walletProviderModel.events.completed,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
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
  $signer,
  $signerWallet,
  $signerBalance,
  $asset,

  $fee,
  $proxyDeposit,
  $existentialDeposit,
  $isLoading: or($pendingFee, getExistentialDepositFx.pending),
  $isEnoughBalance,

  signerSelected,
  stepChanged,

  _test: {
    formSubmitted,
  },
  flow,
};
