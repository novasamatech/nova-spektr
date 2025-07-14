import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import sortBy from 'lodash/sortBy';
import { delay, or, spread } from 'patronum';

import { balanceService } from '@/shared/api/balances';
import { proxyService } from '@/shared/api/proxy';
import {
  AccountType,
  type Asset,
  type Contact,
  CryptoType,
  type MultisigAccount,
  type NoID,
  SigningType,
  type Transaction,
  TransactionType,
  type Wallet,
  WalletType,
} from '@/shared/core';
import {
  Step,
  TEST_ACCOUNTS,
  getNativeAsset,
  isStep,
  nonNullable,
  toAccountId,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { createComplexTxStore, createFeeCalculator } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkUtils } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

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

// Submit
const $coreTx = combine(
  {
    threshold: formModel.form.fields.threshold.$value,
    chain: formModel.form.fields.chainId.$value,
    account: $signer,
    signatories: signatoryModel.$signatories,
  },
  ({ threshold, chain, account, signatories }) => {
    if (!account) return null;

    return transactionBuilder.buildRemark({
      chainId: chain,
      accountId: account.accountId,
      threshold: threshold || 2,
      signatories: signatories.map(s => toAccountId(s.address)),
    });
  },
);

const $transaction = combine(
  {
    api: $api,
    chain: formModel.$chain,
    coreTx: $coreTx,
    signatories: signatoryModel.$signatories,
    signer: $signer,
    threshold: formModel.form.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
    totalDeposit: $totalDeposit,
  },
  ({ api, chain, coreTx, signatories, signer, threshold, multisigAccountId, totalDeposit }) => {
    if (!chain || !coreTx || !api || !signer || !multisigAccountId || !totalDeposit) return null;

    const signatoriesWrapped = signatories
      .filter(a => a.address !== '')
      .map(s => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      api,
      chain,
      signer,
      signatories: signatoriesWrapped,
      multisigAccountId,
      threshold,
      proxyDeposit: totalDeposit.toString(),
    });
  },
);

const $transactionWithPlaceholder = combine(
  {
    chain: formModel.$chain,
    isConnected: formModel.$isChainConnected,
    api: $api,
    transaction: $transaction,
  },
  ({ isConnected, chain, api, transaction }): Transaction | null => {
    if (!chain || !isConnected || !api) return null;
    if (transaction) return transaction;

    const proxyTransaction = transactionBuilder.buildCreatePureProxy({
      chain: chain,
      accountId: TEST_ACCOUNTS[0],
    });

    const extrinsic = getExtrinsic[proxyTransaction.type](proxyTransaction.args, api);
    const callData = extrinsic.method.toHex();
    const callHash = extrinsic.method.hash.toHex();

    return {
      chainId: chain.chainId,
      accountId: TEST_ACCOUNTS[0],
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: 2,
        otherSignatories: [TEST_ACCOUNTS[1]],
        callData,
        callHash,
      },
    };
  },
);

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  $api: $api,
  $transaction: $transactionWithPlaceholder,
});

const { $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: $signer,
  signatory: $signer,
  accounts: accounts.$list,
  chain: formModel.$chain,
  transaction: $transaction,
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
  },
}).filterMap(({ chain, tx, coreTx, route, signer, threshold }) => {
  if (nonNullable(coreTx) && nonNullable(chain) && nonNullable(signer) && nonNullable(tx)) {
    return [
      {
        tx,
        coreTx,
        route,
        signatory: signer,
        initiator: signer,
        threshold,
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
  clock: confirmModel.startSigning,
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

// Create wallet

const createWalletFx = attach({ effect: walletModel.createWallet });

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    step: $step,
    multisigAccoutId: formModel.$multisigAccountId,
  },
  filter: ({ step, chain, multisigAccoutId }, results) => {
    const isSubmitStep = isStep(Step.SUBMIT, step);
    const isSuccessResult = results.some(({ result }) => submitUtils.isSuccessResult(result));

    return nonNullable(chain) && isSubmitStep && isSuccessResult && nonNullable(multisigAccoutId);
  },
  fn: ({ signatories, chain, name, threshold, multisigAccoutId }) => {
    const sortedSignatories = sortBy(
      signatories.map(a => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);
    const account: Omit<NoID<MultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: name.trim(),
      accountId: multisigAccoutId!,
      threshold: threshold,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      type: 'universal',
    };

    return {
      wallet: {
        name,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [account],
    };
  },
  target: createWalletFx,
});

sample({
  clock: createWalletFx.fail,
  fn: ({ error }) => error.message,
  target: $error,
});

sample({
  clock: createWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletProviderModel.events.completed,
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: step => isStep(step, Step.SUBMIT),
  target: flow.close,
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
