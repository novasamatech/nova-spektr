import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { type Chain, type Validator, type Wallet } from '@/shared/core';
import { TEST_ADDRESS, getRelaychainAsset, nonNullable, nullable } from '@/shared/lib/utils';
import { createComplexTxStore } from '@/shared/transactions';
import { type AnyAccount, accounts, multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { validatorsService } from '@/entities/staking';
import { transactionBuilder } from '@/entities/transaction';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { nominateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { validatorsModel } from '@/features/staking';
import { type FormSubmitEvent, type WalletData, Step } from '../lib/types';
import { nominateUtils } from '../lib/utils';

import { formModel } from './form-model';

type InitiatorData = {
  wallet: Wallet;
  initiator: AnyAccount;
  chain: Chain;
};

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore<Step>(stepChanged, Step.NONE).reset(flowFinished);
const $walletData = createStore<InitiatorData | null>(null).reset(flowFinished);
const $validators = createStore<Validator[]>([]).reset(flowFinished);

const $maxValidators = createStore<number>(0);
const $redirectAfterSubmitPath = createStore<string | null>(null).reset(flowStarted);

const getMaxValidatorsFx = createEffect((api: ApiPromise): number => {
  return validatorsService.getMaxValidators(api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    walletData: $walletData,
  },
  ({ apis, walletData }) => {
    return walletData ? (apis[walletData.chain.chainId] ?? null) : null;
  },
);

sample({
  clock: flowStarted,
  target: formModel.formInitiated,
});

sample({
  clock: flowStarted,
  filter: (walletData) => nonNullable(walletData),
  fn: (walletData) => {
    return {
      wallet: walletData.wallet,
      initiator: walletData.shards[0]!,
      chain: walletData.chain,
    };
  },
  target: $walletData,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

// Max validators

sample({
  clock: $api.updates,
  source: $maxValidators,
  filter: (maxValidators, api) => !maxValidators && Boolean(api),
  fn: (_, api) => api!,
  target: getMaxValidatorsFx,
});

sample({
  clock: getMaxValidatorsFx.doneData,
  target: $maxValidators,
});

const $coreTx = combine(
  {
    validators: $validators,
    walletData: $walletData,
    signatory: formModel.$selectedSignatory,
  },
  ({ validators, walletData, signatory }) => {
    if (nullable(walletData) || nullable(signatory)) return null;

    return transactionBuilder.buildNominate({
      chain: walletData.chain,
      accountId: signatory.accountId,
      nominators: validators.map(({ accountId }) => accountId),
    });
  },
);

const { $fee, $tx } = createComplexTxStore({
  api: $api,
  initiator: $walletData.map((data) => data?.initiator ?? null),
  signatory: formModel.$selectedSignatory,
  accounts: accounts.$list,
  chain: $walletData.map((data) => data?.chain ?? null),
  transaction: $coreTx,
});

const $nominateForm = createStore<FormSubmitEvent | null>(null);

sample({
  clock: formModel.formSubmitted,
  target: $nominateForm,
});

sample({
  clock: [$maxValidators.updates, validatorsModel.output.formSubmitted],
  source: {
    step: $step,
  },
  filter: ({ step }) => !nominateUtils.isNoneStep(step),
  fn: (_f, data): Validator[] => {
    if (typeof data === 'number') {
      return Array(data).fill({ address: TEST_ADDRESS });
    }
    return data as Validator[];
  },
  target: $validators,
});

sample({
  clock: formModel.formSubmitted,
  filter: (formData) => nonNullable(formData),
  fn: (formData) => ({
    event: { chain: formData.chain, asset: getRelaychainAsset(formData.chain.assets)! },
    step: Step.VALIDATORS,
  }),
  target: spread({
    event: validatorsModel.events.formInitiated,
    step: stepChanged,
  }),
});

const formSubmitted = sample({
  clock: validatorsModel.output.formSubmitted,
  source: {
    nominateForm: $nominateForm,
    fee: $fee,
    tx: $tx,
    coreTx: $coreTx,
    validators: $validators,
  },
}).filterMap(({ nominateForm, fee, tx, coreTx, validators }) => {
  if (
    nonNullable(nominateForm) &&
    nonNullable(nominateForm.initiator) &&
    nonNullable(nominateForm.signatory) &&
    nonNullable(coreTx) &&
    nonNullable(fee) &&
    nonNullable(tx)
  ) {
    return [
      {
        ...nominateForm,
        asset: getRelaychainAsset(nominateForm!.chain.assets)!,
        fee: fee.toString(),
        totalFee: fee.toString(),
        coreTx,
        tx,
        validators,
      },
    ];
  }
});

sample({
  clock: formSubmitted,
  fn: (event) => {
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
    nominateForm: $nominateForm,
    transaction: $tx,
  },
  filter: ({ nominateForm, transaction }) => {
    return nonNullable(nominateForm) && nonNullable(transaction);
  },
  fn: ({ nominateForm, transaction }) => {
    return {
      event: {
        signingPayloads: [
          {
            chain: nominateForm!.chain,
            account: nominateForm!.initiator,
            signatory: nominateForm!.signatory,
            transaction: transaction!,
          },
        ],
      },
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    nominateForm: $nominateForm,
    transaction: $tx,
    coreTx: $coreTx,
  },
  fn: (source, signParams) => ({
    ...source,
    signParams,
  }),
}).filterMap(({ coreTx, nominateForm, transaction, signParams }) => {
  if (
    nonNullable(nominateForm) &&
    nonNullable(nominateForm.initiator) &&
    nonNullable(nominateForm.signatory) &&
    nonNullable(transaction) &&
    nonNullable(coreTx)
  ) {
    return {
      ...signParams,
      chain: nominateForm.chain,
      account: nominateForm.initiator,
      signatory: nominateForm.signatory,
      coreTxs: [coreTx],
      wrappedTxs: [transaction],
    };
  }
});

sample({
  clock: signSubmitted,
  fn: (event) => {
    return {
      event,
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.events.formInitiated,
    step: stepChanged,
  }),
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: [stepChanged, validatorsModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: { isMultisig: formModel.$isMultisig, coreTx: $coreTx, wrappedTx: $tx },
  filter: ({ isMultisig }, results) => isMultisig && submitUtils.isSuccessResult(results[0]!.result),
  fn: ({ coreTx, wrappedTx }, results) => {
    const { timepoint } = (results[0] as SuccessResult).params;

    return multisigOperationService.generateMultisigOperationRelativeLink({
      chainId: coreTx!.chainId,
      callHash: wrappedTx!.args.callHash,
      multisigAccountId: coreTx!.accountId,
      blockCreated: timepoint.height,
      indexCreated: timepoint.index,
    });
  },
  target: $redirectAfterSubmitPath,
});

sample({
  clock: flowFinished,
  source: $redirectAfterSubmitPath,
  filter: nonNullable,
  target: navigationModel.events.navigateTo,
});

sample({
  clock: txSaved,
  source: {
    coreTx: $coreTx,
    nominateForm: $nominateForm,
  },
  fn: ({ coreTx, nominateForm }) => {
    if (nullable(coreTx) || nullable(nominateForm)) return [];

    return [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route: nominateForm!.route,
        createdAt: Date.now(),
      },
    ];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

export const nominateFlow = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),
  $validators,
  $coreTx,

  events: {
    flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
