import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import sortBy from 'lodash/sortBy';
import { delay, or, spread } from 'patronum';

import { balanceService } from '@/shared/api/balances';
import { proxyService } from '@/shared/api/proxy';
import {
  type Account,
  AccountType,
  type Asset,
  type Chain,
  ChainType,
  type Contact,
  CryptoType,
  type FlexibleMultisigAccount,
  type MultisigAccount,
  type NoID,
  SigningType,
  type Transaction,
  TransactionType,
  WalletType,
} from '@/shared/core';
import {
  SS58_DEFAULT_PREFIX,
  Step,
  TEST_ACCOUNTS,
  isStep,
  nonNullable,
  toAccountId,
  toAddress,
  withdrawableAmountBN,
} from '@/shared/lib/utils';
import { createDepositCalculator, createFeeCalculator } from '@/shared/transactions';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { getExtrinsic, transactionBuilder } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { walletPairingModel } from '@/features/wallets';

import { confirmModel } from './confirm-model';
import { formModel } from './form-model';
import { signatoryModel } from './signatory-model';
import { flexibleMultisigFeature } from './status';
import { walletProviderModel } from './wallet-provider-model';

type FormSubmitEvent = {
  transactions: {
    wrappedTx: Transaction;
    multisigTx?: Transaction;
    coreTx: Transaction;
  };
  formData: {
    signer: Account;
    fee: string;
    multisigDeposit: string;
    threshold: number;
    chain: Chain;
    name: string;
  };
};

export type AddMultisigStore = FormSubmitEvent['formData'];

const stepChanged = createEvent<Step>();
const formSubmitted = createEvent<FormSubmitEvent>();
const flowFinished = createEvent();
const signerSelected = createEvent<Account>();
const walletCreated = createEvent<{
  name: string;
  threshold: number;
}>();

const $step = restore(stepChanged, Step.NAME_NETWORK).reset(flowFinished);

const $proxyDeposit = createStore(BN_ZERO).reset(flowFinished);
const $error = createStore('').reset(flowFinished);
const $wrappedTx = createStore<Transaction | null>(null).reset(flowFinished);
const $coreTx = createStore<Transaction | null>(null).reset(flowFinished);
const $multisigTx = createStore<Transaction | null>(null).reset(flowFinished);
const $addMultisigStore = createStore<AddMultisigStore | null>(null).reset(flowFinished);
const $signer = restore<Account | null>(signerSelected, null).reset(flowFinished);

const $signerWallet = combine({ signer: $signer, wallets: walletModel.$wallets }, ({ signer, wallets }) => {
  return walletUtils.getWalletFilteredAccounts(wallets, {
    accountFn: (a) => a.accountId === signer?.accountId,
    walletFn: (w) => walletUtils.isValidSignatory(w) && w.id === signer?.walletId,
  });
});

const $isChainConnected = combine(
  {
    chainId: formModel.$createMultisigForm.fields.chainId.$value,
    statuses: networkModel.$connectionStatuses,
  },
  ({ chainId, statuses }) => {
    return networkUtils.isConnectedStatus(statuses[chainId]);
  },
);

const $api = combine(flexibleMultisigFeature.state, (state) => {
  if (state.status !== 'running') return null;

  return state.data.api;
});

const $transaction = combine(
  {
    api: $api,
    form: formModel.$createMultisigForm.$values,
    chain: formModel.$chain,
    signatories: signatoryModel.$signatories,
    signer: $signer,
    multisigAccountId: formModel.$multisigAccountId,
    isConnected: $isChainConnected,
    proxyDeposit: $proxyDeposit,
  },
  ({ api, form, chain, isConnected, signatories, signer, proxyDeposit, multisigAccountId }) => {
    if (!isConnected || !chain || !api || !multisigAccountId || !form.threshold || !signer) {
      return null;
    }

    const signatoriesWrapped = signatories.map((s) => ({ accountId: toAccountId(s.address), address: s.address }));

    return transactionBuilder.buildCreateFlexibleMultisig({
      api,
      chain,
      signer: signer,
      signatories: signatoriesWrapped,
      multisigAccountId,
      threshold: form.threshold,
      proxyDeposit: proxyDeposit.toString(),
    });
  },
);

const $fakeTx = combine(
  {
    chain: formModel.$chain,
    isConnected: $isChainConnected,
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
      address: toAddress(TEST_ACCOUNTS[0], { prefix: SS58_DEFAULT_PREFIX }),
      type: TransactionType.MULTISIG_AS_MULTI,
      args: {
        threshold: 2,
        otherSignatories: [],
        callData,
        callHash,
      },
    };
  },
);

const { $: $fee, $pending: $pendingFee } = createFeeCalculator({
  $api: $api,
  $transaction: $fakeTx,
});

const { $deposit: $multisigDeposit, $pending: $pendingDeposit } = createDepositCalculator({
  $api: $api,
  $threshold: formModel.$createMultisigForm.fields.threshold.$value,
});

type GetDepositParams = {
  api: ApiPromise;
  asset: Asset;
};

const getProxyDepositFx = createEffect(async ({ api, asset }: GetDepositParams): Promise<BN> => {
  const minDeposit = await balanceService.getExistentialDeposit(api, asset);
  const proxyDeposit = new BN(proxyService.getProxyDeposit(api, '0', 1));

  return BN.max(minDeposit, proxyDeposit);
});

sample({
  clock: $api,
  source: formModel.$chain,
  filter: (chain, api) => nonNullable(api) && nonNullable(chain) && nonNullable(chain.assets?.[0]),
  fn: (chain, api) => ({ api: api!, asset: chain!.assets[0] }),
  target: getProxyDepositFx,
});

sample({
  clock: getProxyDepositFx.doneData,
  target: $proxyDeposit,
});

const $isEnoughBalance = combine(
  {
    signer: $signer,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    proxyDeposit: $proxyDeposit,
    balances: balanceModel.$balances,
    chain: formModel.$chain,
  },
  ({ signer, fee, multisigDeposit, balances, proxyDeposit, chain }) => {
    if (!signer || !fee || !chain || !chain.assets?.[0]) return false;

    const balance = balanceUtils.getBalance(
      balances,
      signer.accountId,
      chain.chainId,
      chain.assets[0].assetId.toString(),
    );

    return fee
      .add(multisigDeposit)
      .add(new BN(proxyDeposit))
      .lte(new BN(withdrawableAmountBN(balance)));
  },
);

// Submit

sample({
  clock: formModel.$createMultisigForm.formValidated,
  source: {
    signer: $signer,
    transaction: $transaction,
    fee: $fee,
    multisigDeposit: $multisigDeposit,
    chain: formModel.$chain,
  },
  filter: ({ transaction, signer, chain }) => {
    return !!transaction && !!signer && !!chain;
  },
  fn: ({ multisigDeposit, signer, transaction, fee, chain }, formData) => {
    const coreTx = transactionBuilder.buildCreatePureProxy({
      chain: chain!,
      accountId: signer!.accountId,
    });

    return {
      transactions: {
        wrappedTx: transaction!,
        multisigTx: transaction!.args.transactions[0],
        coreTx,
      },
      formData: {
        ...formData,
        chain: chain!,
        signer: signer!,
        fee: fee.toString(),
        account: signer,
        multisigDeposit: multisigDeposit.toString(),
      },
    };
  },
  target: formSubmitted,
});

sample({
  clock: formSubmitted,
  fn: ({ transactions, formData }) => ({
    wrappedTx: transactions.wrappedTx,
    multisigTx: transactions.multisigTx || null,
    coreTx: transactions.coreTx,
    store: formData,
  }),
  target: spread({
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    coreTx: $coreTx,
    store: $addMultisigStore,
  }),
});

sample({
  clock: formSubmitted,
  fn: ({ formData, transactions }) => ({
    event: { ...formData, transaction: transactions.wrappedTx },
    step: Step.CONFIRM,
  }),
  target: spread({
    event: confirmModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: confirmModel.output.formSubmitted,
  source: {
    addMultisigStore: $addMultisigStore,
    wrappedTx: $wrappedTx,
    signer: $signer,
  },
  filter: ({ addMultisigStore, wrappedTx, signer }) =>
    Boolean(addMultisigStore) && Boolean(wrappedTx) && Boolean(signer),
  fn: ({ addMultisigStore, wrappedTx, signer }) => ({
    event: {
      signingPayloads: [
        {
          chain: addMultisigStore!.chain,
          account: signer!,
          transaction: wrappedTx!,
          signatory: null,
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
    addMultisigStore: $addMultisigStore,
    coreTx: $coreTx,
    wrappedTx: $wrappedTx,
    multisigTx: $multisigTx,
    multisigAccountId: formModel.$multisigAccountId,
    signatories: signatoryModel.$signatories,
  },
  filter: ({ addMultisigStore, coreTx, wrappedTx, multisigAccountId }) => {
    return !!addMultisigStore && !!wrappedTx && !!coreTx && !!multisigAccountId;
  },
  fn: ({ addMultisigStore, coreTx, wrappedTx, multisigTx, multisigAccountId, signatories }, signParams) => {
    const isEthereumChain = networkUtils.isEthereumBased(addMultisigStore!.chain.options);
    const signatoriesWrapped = signatories.map((s) => ({ accountId: toAccountId(s.address), address: s.address }));

    return {
      event: {
        ...signParams,
        chain: addMultisigStore!.chain,
        account: {
          signatories: signatoriesWrapped,
          chainId: addMultisigStore!.chain.chainId,
          name: addMultisigStore!.name,
          accountId: multisigAccountId!,
          threshold: addMultisigStore!.threshold,
          cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
          chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
          type: AccountType.MULTISIG,
        } as MultisigAccount,
        coreTxs: [coreTx!],
        wrappedTxs: [wrappedTx!],
        multisigTxs: multisigTx ? [multisigTx] : [],
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
    const contactMap = new Map(contacts.map((c) => [c.accountId, c]));
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
    const contactsSet = new Set(contacts.map((c) => c.accountId));

    return signatories
      .slice(1)
      .filter((signatory) => !contactsSet.has(toAccountId(signatory.address)))
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

sample({
  clock: submitModel.output.formSubmitted,
  source: {
    name: formModel.$createMultisigForm.fields.name.$value,
    threshold: formModel.$createMultisigForm.fields.threshold.$value,
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
      signatories.map((a) => ({ address: a.address, accountId: toAccountId(a.address) })),
      'accountId',
    );

    const isEthereumChain = networkUtils.isEthereumBased(chain!.options);
    const account: Omit<NoID<FlexibleMultisigAccount>, 'walletId'> = {
      signatories: sortedSignatories,
      chainId: chain!.chainId,
      name: name.trim(),
      accountId: multisigAccoutId!,
      threshold: threshold,
      cryptoType: isEthereumChain ? CryptoType.ETHEREUM : CryptoType.SR25519,
      chainType: isEthereumChain ? ChainType.ETHEREUM : ChainType.SUBSTRATE,
      type: AccountType.FLEXIBLE_MULTISIG,
    };

    return {
      wallet: {
        name,
        type: WalletType.FLEXIBLE_MULTISIG,
        signingType: SigningType.MULTISIG,
      },
      accounts: [account],
      external: false,
    };
  },
  target: walletModel.events.flexibleMultisigCreated,
});

sample({
  clock: walletModel.events.walletCreationFail,
  fn: ({ error }) => error.message,
  target: $error,
});

sample({
  clock: walletModel.events.walletCreatedDone,
  filter: ({ wallet, external }) => wallet.type === WalletType.FLEXIBLE_MULTISIG && !external,
  fn: ({ wallet }) => wallet.id,
  target: walletProviderModel.events.completed,
});

sample({
  clock: delay(submitModel.output.formSubmitted, 2000),
  source: $step,
  filter: (step) => isStep(step, Step.SUBMIT),
  target: flowFinished,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: walletProviderModel.events.completed,
});

sample({
  clock: walletModel.events.walletRestoredSuccess,
  target: flowFinished,
});

sample({
  clock: flexibleMultisigFeature.stopped,
  target: formModel.$createMultisigForm.reset,
});

sample({
  clock: flowFinished,
  target: walletPairingModel.events.walletTypeCleared,
});

sample({
  clock: delay(flowFinished, 2000),
  fn: () => Step.NAME_NETWORK,
  target: stepChanged,
});

sample({
  clock: flexibleMultisigFeature.stopped,
  target: signatoryModel.$signatories.reinit,
});

export const flexibleMultisigModel = {
  $error,
  $step,
  $api,
  $signer,
  $signerWallet,
  $transaction,

  $fee,
  $proxyDeposit,
  $multisigDeposit,
  $isLoading: or($pendingFee, $pendingDeposit, getProxyDepositFx.pending),
  $isEnoughBalance,

  events: {
    signerSelected,
    walletCreated,
    stepChanged,

    _test: {
      formSubmitted,
    },
  },
  output: {
    flowFinished,
  },
};
