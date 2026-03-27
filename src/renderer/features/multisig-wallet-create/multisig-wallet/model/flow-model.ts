import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { createGate } from 'effector-react';
import { sortBy } from 'lodash';
import { delay, spread } from 'patronum';

import {
  type Chain,
  type ChainId,
  type Contact,
  type MultisigAccount,
  type NoID,
  type Wallet,
  AccountNameType,
  AccountType,
  CryptoType,
  SigningType,
  WalletType,
} from '@/shared/core';
import {
  Step,
  TEST_ACCOUNTS,
  getNativeAsset,
  isStep,
  nonNullable,
  nullable,
  toAccountId,
  toAddress,
} from '@/shared/lib/utils';
import {
  createFeeCalculator,
  createMultisigDeposit,
  createSignatoriesStore,
  createTxValidationStore,
  createTxValidator,
} from '@/shared/transactions';
import { type AnyAccount, type ChainAccount, accountService, accountSync, accounts } from '@/domains/network';
import { balanceModel } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { type ExtrinsicResultParams, getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';

const createWalletFx = attach({ effect: walletModel.createWallet });

const flow = createGate();

const stepChanged = createEvent<Step>();
const signerSelected = createEvent<AnyAccount>();

const $step = restore(stepChanged, Step.SIGNATORIES_THRESHOLD).reset(flow.open);

const $signer = restore(signerSelected, null).reset(flow.open);

const $initiators = createStore<AnyAccount[] | null>(null).reset(flow.close);
const $initiatorWallet = createStore<Wallet | null>(null).reset(flow.close);

const $multisigChains = combine(networkModel.$chains, chains => {
  return Object.values(chains).filter(chain => networkUtils.isMultisigSupported(chain.options));
});

sample({
  clock: signatoryModel.$ownedSignatoriesWallets,
  source: {
    signatories: signatoryModel.$signatories,
    accounts: accounts.$list,
  },
  filter: (_, ownedSignatoriesWallets) => ownedSignatoriesWallets.length > 0,
  fn: ({ signatories, accounts }) => {
    const ownSignatory = signatories.at(0);
    if (!ownSignatory || !ownSignatory.walletId) return null;
    return (
      accounts.filter(
        a => a.walletId.toString() === ownSignatory.walletId && a.accountId === toAccountId(ownSignatory.address),
      ) ?? null
    );
  },
  target: $initiators,
});

const $initiator = combine($initiators, formModel.$chain, (initiators, chain) => {
  if (nullable(initiators) || nullable(chain)) return null;

  return initiators.find(i => accountService.isAccountAvailableOnChain(i, chain)) ?? initiators[0] ?? null;
});

sample({
  clock: $initiators,
  source: walletModel.$wallets,
  filter: (_, initiators) => nonNullable(initiators),
  fn: (wallets, initiators) => {
    return wallets.find(w => w.id === initiators?.at(0)?.walletId) ?? null;
  },
  target: $initiatorWallet,
});

sample({
  clock: $initiatorWallet,
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

    return multisigChains[nextChainIndex]?.chainId ?? multisigChains[0]!.chainId;
  },
  target: formModel.form.fields.chainId.change,
});

const $signatories = createSignatoriesStore({
  chain: formModel.$chain,
  initiator: $initiator,
  accounts: accounts.$list,
});

// Signatories for all multisig chains
const $allChainsSignatories = combine(
  {
    multisigChains: $multisigChains,
    initiators: $initiators,
    accounts: accounts.$list,
  },
  ({ multisigChains, initiators, accounts }) => {
    if (nullable(initiators) || !multisigChains.length) return {} as Record<ChainId, AnyAccount[]>;

    return multisigChains.reduce(
      (acc, chain: Chain) => {
        const signatories = initiators.flatMap(initiator => accountService.findSignatories(initiator, accounts, chain));
        acc[chain.chainId] = signatories;
        return acc;
      },
      {} as Record<ChainId, AnyAccount[]>,
    );
  },
);

// in the current implementation, the first signatory is always the signer
//github.com/novasamatech/nova-spektr/issues/4565
sample({
  clock: $signatories,
  fn: signatories => {
    return signatories.length >= 1 ? signatories[0]! : null;
  },
  target: $signer,
});

// when we change initiator and it's a chain account - change chain for it
sample({
  clock: signatoryModel.events.changeSignatory,
  source: {
    multisigChains: $multisigChains,
    initiators: $initiators,
  },
  filter: ({ initiators }, addedSignatory) => {
    return (
      addedSignatory.index === 0 &&
      nonNullable(initiators) &&
      initiators.length === 1 &&
      accountService.isChainAccount(initiators[0]!)
    );
  },
  fn: ({ multisigChains, initiators }) => {
    const initiator = initiators!.at(0)! as ChainAccount;

    return multisigChains.find(i => i.chainId === initiator.chainId)?.chainId ?? multisigChains[0]!.chainId;
  },
  target: formModel.form.fields.chainId.change,
});

const $tx = combine(
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

const $fakeTx = combine(
  {
    chainId: formModel.form.fields.chainId.$value,
  },
  ({ chainId }) => {
    if (!chainId) return null;

    return transactionBuilder.buildRemark({
      chainId,
      accountId: TEST_ACCOUNTS[0],
      threshold: 2,
      signatories: [TEST_ACCOUNTS[0], TEST_ACCOUNTS[1]],
    });
  },
);

const $fakeExtrinsic = combine($api, $fakeTx, (api, tx) => {
  if (nullable(api)) return null;
  if (nullable(tx)) return null;
  return getExtrinsic[tx.type](tx.args, api);
});

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  extrinsic: $fakeExtrinsic,
});

const $route = combine($signer, signer => (signer ? [signer] : []));
const $asset = combine(formModel.$chain, chain => (chain ? getNativeAsset(chain.assets) : null));

const validator = createTxValidator();
const { $errors, $valid } = createTxValidationStore({
  validator,
  params: {
    api: $api,
    asset: $asset,
    balances: balanceModel.$balanceMap,
    route: $route,
    transaction: $tx,
  },
});

const { $multisigDeposit, $pending: $isDepositLoading } = createMultisigDeposit({
  $threshold: formModel.form.fields.threshold.$value,
  $api: $api,
});

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
    coreTx: $tx,
    route: $route,
    signatory: $signer,
    initiator: $initiator,
    chain: formModel.$chain,
    threshold: formModel.form.fields.threshold.$value,
  },
}).filterMap(({ chain, tx, coreTx, route, signatory, threshold, initiator }) => {
  if (
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(signatory) &&
    nonNullable(tx) &&
    nonNullable(initiator)
  ) {
    return [
      {
        tx,
        coreTx,
        route,
        signatory,
        initiator,
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
    signatory: $signer,
    initiator: $initiator,
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
          signatory,
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
  fn: ({ signatories, chain, name, threshold }, results) => {
    const sortedSignatories = sortBy(
      Array.from(signatories.values()).map(a => ({
        address: a.address,
        accountId: toAccountId(a.address),
        walletId: a.walletId,
      })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);
    const cryptoType = isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519;
    const accountIds = sortedSignatories.map(s => s.accountId);
    const accountId = accountUtils.getMultisigAccountId(accountIds, threshold, cryptoType);

    const successResult = results.find(({ result }) => submitUtils.isSuccessResult(result));
    const blockNumber = successResult ? (successResult.params as ExtrinsicResultParams)?.timepoint?.height : undefined;

    const account: Omit<NoID<MultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      name: name.trim(),
      nameType: AccountNameType.CUSTOM,
      accountId: accountId,
      threshold: threshold,
      cryptoType,
      signingType: SigningType.MULTISIG,
      accountType: AccountType.MULTISIG,
      type: 'universal',
      blockNumber,
      remarkChainId: chain!.chainId,
      createdAt: Date.now(),
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
  clock: createWalletFx.doneData.filter({ fn: nonNullable }),
  fn: ({ wallet }) => wallet.id,
  target: walletSelect.select,
});

sample({
  clock: createWalletFx.doneData,
  target: accountSync.syncAccounts,
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
      .filter(signatory => !signatory.walletId && !contactsSet.has(toAccountId(signatory.address)))
      .map(({ address, name }) => ({
        address: toAddress(address),
        name: name,
        accountId: toAccountId(address),
        source: 'local' as const,
      }));
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
  clock: walletModel.restoreWallets.done,
  target: flow.close,
});

sample({
  clock: flow.close,
  target: [formModel.form.reset, signatoryModel.$signatories.reinit],
});

sample({
  clock: flow.close,
  fn: () => Step.NONE,
  target: $step,
});

export const flowModel = {
  $errors,
  $step,
  $initiator,
  $initiators,
  $signer,
  $initiatorWallet,
  $tx,
  $route,

  $fee,
  $isFeeLoading: $pendingFee,
  $multisigDeposit,
  $isDepositLoading,

  signerSelected,
  stepChanged,

  //for tests
  formSubmitted,

  $multisigChains,

  $allChainsSignatories,

  $valid,

  flow,
};
