import { BN } from '@polkadot/util';
import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import sortBy from 'lodash/sortBy';
import { delay, spread } from 'patronum';

import { $features } from '@/shared/config/features';
import {
  AccountType,
  type Contact,
  CryptoType,
  type MultisigAccount,
  type NoID,
  SigningType,
  type TxWrapper,
  type Wallet,
  WalletType,
  WrapperKind,
} from '@/shared/core';
import { Step, getNativeAsset, isStep, nonNullable, toAccountId, withdrawableAmountBN } from '@/shared/lib/utils';
import { createComplexTxStore, createMultisigDeposit } from '@/shared/transactions';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { transactionBuilder, transactionService } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { proxiesModel } from '@/features/proxies';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const createWalletFx = attach({ effect: walletModel.createWallet });

const flow = createGate();

const stepChanged = createEvent<Step>();
const signerSelected = createEvent<AnyAccount>();

const $step = restore(stepChanged, Step.SIGNATORIES_THRESHOLD).reset(flow.close);

const $error = createStore('').reset(flow.close);
const $signer = restore(signerSelected, null).reset(flow.close);

const $signerWallet = createStore<Wallet | null>(null).reset(flow.close);

sample({
  clock: signatoryModel.$ownedSignatoriesWallets,
  source: signatoryModel.$signatories,
  filter: ownedSignatoriesWallets => ownedSignatoriesWallets.length > 0,
  fn: (signatories, wallets) => {
    const ownSignatory = signatories.at(0);
    if (!ownSignatory || !ownSignatory.walletId) return null;

    return wallets.find(w => w.id.toString() === ownSignatory.walletId) ?? null;
  },
  target: $signerWallet,
});

sample({
  clock: $signerWallet,
  source: { accounts: accounts.$list, chain: formModel.$chain },
  filter: ({ chain }, wallet) => nonNullable(wallet) && nonNullable(chain),
  fn: ({ accounts, chain }, wallet) => {
    return accounts.find(a => a.walletId === wallet!.id && accountService.isAccountAvailableOnChain(a, chain!)) ?? null;
  },
  target: $signer,
});

sample({
  clock: $signerWallet,
  filter: nonNullable,
  fn: wallet => [wallet!],
  target: signatoryModel.events.getSignatoriesBalance,
});

const $api = combine(
  {
    apis: networkModel.$apis,
    chainId: formModel.form.fields.chainId.$value,
  },
  ({ apis, chainId }) => {
    return apis[chainId] ?? null;
  },
);

const $multisigChains = combine(networkModel.$chains, chains => {
  return Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
});

// If the current chain is not connected switch to the next one
sample({
  clock: flow.open,
  source: {
    isChainConnected: formModel.$isChainConnected,
    multisigChains: $multisigChains,
    chainId: formModel.form.fields.chainId.$value,
  },
  filter: ({ isChainConnected }) => !isChainConnected,
  fn: ({ multisigChains, chainId }) => {
    const nextChainIndex = multisigChains.findIndex(chain => chain.chainId === chainId) + 1;

    return multisigChains[nextChainIndex]?.chainId ?? multisigChains[0].chainId;
  },
  target: formModel.form.fields.chainId.change,
});

const $coreTx = combine(
  {
    threshold: formModel.form.fields.threshold.$value,
    chainId: formModel.form.fields.chainId.$value,
    account: $signer,
    signatories: signatoryModel.$signatories,
  },
  ({ threshold, chainId, account, signatories }) => {
    if (!account) return null;

    return transactionBuilder.buildRemark({
      chainId,
      accountId: account.accountId,
      threshold: threshold || 2,
      signatories: Array.from(signatories.values()).map(s => toAccountId(s.address)),
    });
  },
);

const $transaction = combine(
  {
    apis: networkModel.$apis,
    chain: formModel.$chain,
    remarkTx: $coreTx,
    signatories: signatoryModel.$signatories,
    signer: $signer,
    threshold: formModel.form.fields.threshold.$value,
    multisigAccountId: formModel.$multisigAccountId,
    features: $features,
  },
  ({ apis, chain, remarkTx, signatories, signer, threshold, multisigAccountId, features }) => {
    if (!chain || !remarkTx || !signer || !multisigAccountId) return null;

    const signatoriesWrapped = Array.from(signatories.values())
      .filter(a => a.address !== '')
      .map(s => ({
        accountId: toAccountId(s.address),
        address: s.address,
      }));

    const txWrappers: TxWrapper[] = features.multisigRemark
      ? []
      : [
          {
            kind: WrapperKind.MULTISIG,
            multisigAccount: {
              accountId: multisigAccountId,
              signatories: signatoriesWrapped,
              threshold,
            } as unknown as MultisigAccount,
            signatories: Array.from(signatories.values()).map(s => ({
              accountId: toAccountId(s.address),
            })) as AnyAccount[],
            signer,
          },
        ];

    return transactionService.getWrappedTransaction({
      api: apis[chain.chainId],
      transaction: remarkTx,
      txWrappers,
    });
  },
);

const { $multisigDeposit, $pending: $pendingDeposit } = createMultisigDeposit({
  $threshold: formModel.form.fields.threshold.$value,
  $api: $api,
});

const { $fee, $pendingFee, $tx, $route } = createComplexTxStore({
  api: $api,
  initiator: $signer,
  signatory: $signer,
  accounts: accounts.$list,
  chain: formModel.$chain,
  transaction: $transaction.map(tx => tx?.wrappedTx ?? null), // TODO: replace with coreTx after subquery support
});

const $signerBalance = combine(
  {
    signer: $signer,
    balances: balanceModel.$balances,
    chain: formModel.$chain,
  },
  ({ signer, balances, chain }) => {
    if (!signer || !chain) return null;

    return (
      balanceUtils.getBalance(balances, signer.accountId, chain.chainId, getNativeAsset(chain.assets).assetId) ?? null
    );
  },
);

const $isEnoughBalance = combine(
  {
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    signerBalance: $signerBalance,
  },
  ({ fee, multisigDeposit, signerBalance }) => {
    if (!signerBalance || !fee || !multisigDeposit) return false;

    return new BN(fee).add(new BN(multisigDeposit)).lte(withdrawableAmountBN(signerBalance));
  },
);

sample({
  clock: formModel.formSubmitted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Submit

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
  fn: ({ chain, coreTx, tx, signer }, signParams) => ({
    event: {
      ...signParams,
      chain: chain!,
      account: signer!,
      signatory: signer,
      coreTxs: [coreTx!],
      wrappedTxs: [tx!],
    },
    step: Step.SUBMIT,
  }),
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.form.fields.name.$value,
    threshold: formModel.form.fields.threshold.$value,
    signatories: signatoryModel.$signatories,
    chain: formModel.$chain,
    step: $step,
  },
  filter: ({ step, chain }, results) => {
    const isSubmitStep = isStep(Step.SUBMIT, step);
    const isSuccessResult = results.some(({ result }) => submitUtils.isSuccessResult(result));

    return nonNullable(chain) && isSubmitStep && isSuccessResult;
  },
  fn: ({ signatories, chain, name, threshold }) => {
    const sortedSignatories = sortBy(
      Array.from(signatories.values()).map(a => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = sortedSignatories.map(s => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    const account: Omit<NoID<MultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: name.trim(),
      accountId: accountId,
      threshold: threshold,
      cryptoType,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      type: 'universal',
    };

    return {
      wallet: {
        name,
        type: WalletType.MULTISIG,
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
  target: walletSelect.select,
});

sample({
  clock: createWalletFx.doneData,
  target: proxiesModel.findAllProxies,
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
    contactPending: contactModel.effects.createContactsFx.pending,
  },
  filter: ({ contactPending }) => !contactPending,
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
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: step => isStep(step, Step.SUBMIT),
  target: flow.close,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: flow.close,
});

sample({
  clock: flow.close,
  target: [formModel.form.reset, signatoryModel.$signatories.reinit],
});

export const flowModel = {
  $error,
  $step,
  $signer,
  $signerWallet,
  $isEnoughBalance,
  $tx,
  $signerBalance,

  $fee,
  $isFeeLoading: $pendingFee,
  $isMultisigDepositLoading: $pendingDeposit,
  $multisigDeposit,

  signerSelected,
  stepChanged,

  //for tests
  formSubmitted,

  flow,
};
