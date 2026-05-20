import { attach, combine, createEvent, createStore, restore, sample } from 'effector';
import { delay, spread } from 'patronum';

import { type PartialProxiedAccount, ProxyTypes, ProxyVariant } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { Paths } from '@/shared/routes';
import { multisigOperationService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { proxyModel } from '@/entities/proxy';
import { type ExtrinsicResultParams } from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { type BasketTransactionDraft, basketOperations } from '@/aggregates/basket-operations';
import { balanceSubModel } from '@/features/assets-balances';
import { wireDraftCloseRedirect } from '@/features/drafts';
import { navigationModel } from '@/features/navigation';
import { type SigningPayload } from '@/features/operations/OperationSign';
import { signModel } from '@/features/operations/OperationSign/model/sign-model';
import { type SuccessResult, submitModel, submitUtils } from '@/features/operations/OperationSubmit';
import {
  type AddPureProxiedConfirm,
  addPureProxiedConfirmModel as confirmModel,
} from '@/features/operations/OperationsConfirm/AddPureProxied';
import { walletsModel } from '@/features/proxied-wallet';
import { proxiesModel } from '@/features/proxies';
import { addPureProxiedUtils } from '../lib/add-pure-proxied-utils';
import { Step } from '../lib/types';

import { formModel } from './form-model';

const stepChanged = createEvent<Step>();

const flowFinished = createEvent();
const txSaved = createEvent();

const $step = restore(stepChanged, Step.NONE);

const $redirectAfterSubmitPath = createStore<string | null>(null).reset(formModel.flowStarted);

const $initiatorWallet = combine(
  {
    initiator: formModel.form.fields.initiator.$value,
    wallets: walletModel.$wallets,
  },
  ({ initiator, wallets }) => {
    if (!initiator) return null;

    return walletUtils.getWalletById(wallets, initiator.walletId);
  },
);

const subscribePureEventFx = attach({ effect: walletsModel.subscribePureEventFx });

sample({
  clock: formModel.flowStarted,
  fn: () => Step.INIT,
  target: stepChanged,
});

sample({
  clock: formModel.flowStarted,
  source: formModel.$wallet,
  filter: wallet => nonNullable(wallet),
  target: balanceSubModel.fetchWallet,
});

sample({
  clock: formModel.flowStarted,
  target: formModel.formInitiated,
});

const formSubmitted = sample({
  clock: formModel.formSubmitted,
  source: {
    coreTx: formModel.$coreTx,
    multisigDeposit: formModel.$multisigDeposit,
    route: formModel.$route,
    fee: formModel.$fee,
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
  },
  fn: (source, formSubmitted) => {
    return {
      ...source,
      ...formSubmitted,
    };
  },
}).filterMap(({ coreTx, multisigDeposit, route, tx, chain, formData }) => {
  if (
    nonNullable(tx) &&
    nonNullable(coreTx) &&
    nonNullable(chain) &&
    nonNullable(formData.signatory) &&
    nonNullable(formData.initiator)
  ) {
    return [
      {
        ...formData,
        initiator: formData.initiator,
        signatory: formData.signatory,
        multisigDeposit: multisigDeposit.toString(),
        fee: formData.fee,
        proxyDeposit: formData.proxyDeposit,
        chain,
        coreTx,
        route,
        tx,
      } satisfies AddPureProxiedConfirm,
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
    tx: formModel.$tx,
    chain: formModel.form.fields.chain.$value,
    initiator: formModel.form.fields.initiator.$value,
    signatory: formModel.form.fields.signatory.$value,
  },
  filter: ({ tx, chain, initiator, signatory }) =>
    nonNullable(tx) && nonNullable(chain) && nonNullable(initiator) && nonNullable(signatory) && nonNullable(chain),
  fn: ({ tx, chain, initiator, signatory }) => ({
    event: {
      signingPayloads: [
        {
          chain: chain!,
          account: initiator!,
          signatory,
          transaction: tx!,
        },
      ] satisfies SigningPayload[],
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
  source: $step,
  filter: step => step !== Step.NONE,
  fn: (_, signParams) => {
    return {
      event: signParams,
      step: Step.SUBMIT,
    };
  },
  target: spread({
    event: submitModel.init,
    step: stepChanged,
  }),
});

sample({
  clock: submitModel.done,
  source: {
    step: $step,
    apis: networkModel.$apis,
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ step, initiator, chain, apis }) =>
    addPureProxiedUtils.isSubmitStep(step) &&
    nonNullable(initiator) &&
    nonNullable(chain) &&
    nonNullable(chain.chainId) &&
    nonNullable(apis[chain.chainId]),
  fn: ({ apis, initiator, chain }, submitData) => {
    const timepoint = (submitData[0]?.params as ExtrinsicResultParams).timepoint;

    return {
      api: apis[chain!.chainId]!,
      initiator: initiator!,
      timepoint,
    };
  },
  target: subscribePureEventFx,
});

sample({
  clock: subscribePureEventFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ initiator, chain }, { accountId }) => [
    {
      accountId: initiator!.accountId,
      proxiedAccountId: accountId,
      chainId: chain!.chainId,
      proxyType: ProxyTypes.ANY,
      delay: 0,
    },
  ],
  target: proxyModel.events.proxiesAdded,
});

sample({
  clock: subscribePureEventFx.doneData,
  source: {
    initiator: formModel.form.fields.initiator.$value,
    chain: formModel.form.fields.chain.$value,
    proxyDeposit: formModel.$proxyDeposit,
  },
  filter: ({ initiator, chain }) => nonNullable(initiator) && nonNullable(chain),
  fn: ({ chain, initiator, proxyDeposit }, { accountId, entropyBlockNumber, extrinsicIndex, pendingBlockNumber }) => {
    return [
      {
        accountId,
        chainId: chain!.chainId,
        connections: [
          {
            proxyAccountId: initiator!.accountId,
            delay: 0,
            proxyType: ProxyTypes.ANY,
          },
        ],
        proxyVariant: ProxyVariant.PURE,
        entropyBlockNumber,
        pendingBlockNumber,
        extrinsicIndex,
        deposit: proxyDeposit,
        spawner: initiator!.accountId,
      },
    ] satisfies PartialProxiedAccount[];
  },
  target: proxiesModel.createProxiedWalletsFx,
});

sample({
  clock: submitModel.done,
  source: { isMultisig: formModel.$isMultisig, coreTx: formModel.$coreTx, wrappedTx: formModel.$tx },
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

wireDraftCloseRedirect({
  $initiatedDraft: formModel.$initiatedDraft,
  flowFinished,
  redirectTarget: $redirectAfterSubmitPath,
  destination: Paths.OPERATIONS,
});

sample({
  clock: txSaved,
  source: {
    coreTx: formModel.$coreTx,
  },
  fn: ({ coreTx }) => {
    if (nullable(coreTx)) return [];

    const tx: BasketTransactionDraft = {
      initiatorAccountId: coreTx.accountId,
      coreTx,
      route: [],
      createdAt: Date.now(),
    };

    return [tx];
  },
  target: basketOperations.addTransactions,
});

sample({
  clock: txSaved,
  fn: () => Step.BASKET,
  target: stepChanged,
});

sample({
  clock: delay(subscribePureEventFx.doneData, 2000),
  target: flowFinished,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

export const addPureProxiedModel = {
  $step,
  $initiatorWallet,

  events: {
    flowStarted: formModel.flowStarted,
    stepChanged,
    txSaved,
  },
  output: {
    flowFinished,
  },
};
