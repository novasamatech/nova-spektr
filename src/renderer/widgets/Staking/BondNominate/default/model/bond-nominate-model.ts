import { type ApiPromise } from '@polkadot/api';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { spread } from 'patronum';

import { TEST_ADDRESS, getRelaychainAsset, nonNullable, nullable, toAddress } from '@/shared/lib/utils';
import { type PathType, Paths } from '@/shared/routes';
import { networkModel } from '@/entities/network';
import { validatorsService } from '@/entities/staking';
import { transactionService } from '@/entities/transaction';
import { accountUtils } from '@/entities/wallet';
import { basketOperations } from '@/aggregates/basket-operations';
import { navigationModel } from '@/features/navigation';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import { bondNominateConfirmModel as confirmModel } from '@/features/operations/OperationsConfirm';
import { type BondNominateConfirm } from '@/features/operations/OperationsConfirm/BondNominate/model/confirm-model';
import { validatorsModel } from '@/features/staking';
import { bondUtils } from '../lib/bond-utils';
import { type BondNominateData, Step, type WalletData } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowStarted = createEvent<WalletData>();
const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $walletData = restore<WalletData | null>(flowStarted, null).reset(flowFinished);
const $bondNominateData = createStore<BondNominateData | null>(null).reset(flowFinished);
const $multisigDeposit = createStore<string | null>(null).reset(flowFinished);
const $redirectAfterSubmitPath = createStore<PathType | null>(null).reset(flowStarted);

const $maxValidators = createStore<number>(0);

const getMaxValidatorsFx = createEffect((api: ApiPromise): number => {
  return validatorsService.getMaxValidators(api);
});

type DepositParams = {
  api: ApiPromise;
  threshold: number;
};
const getMultisigDepositFx = createEffect(({ api, threshold }: DepositParams): string => {
  return transactionService.getMultisigDeposit(threshold, api);
});

const $api = combine(
  {
    apis: networkModel.$apis,
    walletData: $walletData,
  },
  ({ apis, walletData }) => {
    return walletData ? apis[walletData.chain.chainId] : null;
  },
);

// Max validators

sample({
  clock: $api.updates,
  source: $maxValidators,
  filter: (maxValidators, api) => !maxValidators && nonNullable(api),
  fn: (_, api) => api!,
  target: getMaxValidatorsFx,
});

sample({
  clock: getMaxValidatorsFx.doneData,
  target: $maxValidators,
});

// Transaction & Form

sample({
  clock: [$maxValidators.updates, formModel.formChanged, validatorsModel.output.formSubmitted],
  source: {
    step: $step,
    bondData: $bondNominateData,
  },
  filter: ({ step, bondData }, data) => {
    return (!bondUtils.isNoneStep(step) && nonNullable(bondData)) || typeof data !== 'number';
  },
  fn: ({ bondData }, data) => {
    if (typeof data === 'number') {
      return { ...(bondData || ({} as BondNominateData)), validators: Array(data).fill({ address: TEST_ADDRESS }) };
    }

    if (Array.isArray(data)) {
      return { ...bondData!, validators: data! };
    }

    return {
      initiator: data!.initiator!,
      signatory: data!.signatory!,
      amount: data!.amount,
      destination: toAddress(data!.destination),
      validators: bondData?.validators ?? [],
    };
  },
  target: $bondNominateData,
});

sample({
  source: {
    api: $api,
    route: formModel.$route,
  },
  filter: ({ api, route }) => nonNullable(api) && nonNullable(route),
  fn: ({ api, route }) => {
    const multisig = route.find(accountUtils.isAnyMultisigAccount);
    return {
      api: api!,
      threshold: multisig?.threshold ?? 0,
    };
  },
  target: getMultisigDepositFx,
});

sample({
  clock: getMultisigDepositFx.doneData,
  target: [$multisigDeposit, formModel.multisigDepositChanged],
});

// Steps

sample({
  clock: flowStarted,
  target: formModel.formInitiated,
});

sample({
  clock: flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.formSubmitted,
  source: $walletData,
  filter: (walletData: WalletData | null): walletData is WalletData => Boolean(walletData),
  fn: ({ chain }) => ({
    event: { chain, asset: getRelaychainAsset(chain.assets)! },
    step: Step.VALIDATORS,
  }),
  target: spread({
    event: validatorsModel.events.formInitiated,
    step: stepChanged,
  }),
});

const validatorsFormSubmitted = sample({
  clock: validatorsModel.output.formSubmitted,
  source: {
    bondData: $bondNominateData,
    fee: formModel.$fee,
    walletData: $walletData,
    coreTx: formModel.$coreTx,
    tx: formModel.$tx,
    route: formModel.$route,
    multisigDeposit: $multisigDeposit,
  },
}).filterMap(({ bondData, fee, walletData, coreTx, multisigDeposit, tx, route }) => {
  if (
    nonNullable(bondData) &&
    nonNullable(fee) &&
    nonNullable(walletData) &&
    nonNullable(coreTx) &&
    nonNullable(multisigDeposit) &&
    nonNullable(tx) &&
    nonNullable(route)
  ) {
    return [
      {
        ...bondData,
        chain: walletData.chain,
        asset: getRelaychainAsset(walletData.chain.assets)!,
        fee: fee.toString(),
        totalFee: fee.toString(),
        multisigDeposit,
        coreTx,
        tx,
        route,
      } satisfies BondNominateConfirm,
    ];
  }
});

sample({
  clock: validatorsFormSubmitted,
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

const confirmStartSigning = sample({
  clock: confirmModel.startSigning,
  source: {
    bondData: $bondNominateData,
    walletData: $walletData,
    transaction: formModel.$tx,
  },
}).filterMap(({ bondData, walletData, transaction }) => {
  if (nonNullable(bondData) && nonNullable(walletData) && nonNullable(transaction)) {
    return {
      signingPayloads: [
        {
          chain: walletData.chain,
          account: bondData.initiator,
          signatory: bondData.signatory,
          transaction: transaction,
        },
      ],
    };
  }
});

sample({
  clock: confirmStartSigning,
  fn: (event) => {
    return {
      event,
      step: Step.SIGN,
    };
  },
  target: spread({
    event: signModel.events.formInitiated,
    step: stepChanged,
  }),
});

const signFormSubmitted = sample({
  clock: signModel.output.formSubmitted,
  source: {
    bondData: $bondNominateData,
    walletData: $walletData,
    coreTx: formModel.$coreTx,
    wrappedTx: formModel.$tx,
  },
  fn: (source, signParams) => ({ source, signParams }),
}).filterMap(({ signParams, source: { bondData, walletData, coreTx, wrappedTx } }) => {
  if (nonNullable(bondData) && nonNullable(walletData) && nonNullable(coreTx) && nonNullable(wrappedTx)) {
    return {
      ...signParams,
      chain: walletData.chain,
      account: bondData.initiator,
      signatory: bondData.signatory,
      coreTxs: [coreTx],
      wrappedTxs: [wrappedTx],
    };
  }
});

sample({
  clock: signFormSubmitted,
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
  target: [stepChanged, formModel.formCleared, validatorsModel.events.formCleared],
});

sample({
  clock: submitModel.output.formSubmitted,
  source: formModel.$isMultisig,
  filter: (isMultisig, results) => isMultisig && submitUtils.isSuccessResult(results[0].result),
  fn: () => Paths.OPERATIONS,
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
    coreTx: formModel.$coreTx,
    route: formModel.$route,
  },
  fn: ({ coreTx, route }) => {
    if (nullable(coreTx)) return [];

    return [
      {
        initiatorAccountId: coreTx.accountId,
        coreTx,
        route,
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

export const bondNominateModel = {
  $step,
  $walletData,
  $initiatorWallet: $walletData.map((data) => data?.wallet || null),

  flowStarted,
  stepChanged,
  txSaved,
  flowFinished,
};
