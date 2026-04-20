import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { t } from 'i18next';
import { readonly } from 'patronum';
import { toast } from 'sonner';

import { type CallData, type Chain } from '@/shared/core';
import { createQueuedEffect } from '@/shared/effector';
import { nonNullable, nullable } from '@/shared/lib/utils';
import {
  type ExtrinsicConfirmInfo,
  createExtrinsicConfirmStore,
  createFeeCalculator,
  createSignatoriesStore,
} from '@/shared/transactions';
import { createRouteStore } from '@/shared/transactions/createRouteStore';
import { createWrappedTxStore } from '@/shared/transactions/createWrappedTxStore';
import { type Draft, operationDescriptionsResource, operationsService } from '@/domains/backend';
import { type AnyAccount, type AnyTransaction, type EncodedTransaction, transactionService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletModel } from '@/entities/wallet';
import { backendConfigurationModel } from '@/aggregates/backend';
import { type TransactionSigningPayload, signModel } from '@/features/operations/OperationSign';
import { type SuccessResult, ExtrinsicResult, submitModel } from '@/features/operations/OperationSubmit';

import './drafts-model'; // side-effect: orchestration wiring

enum Step {
  NONE,
  CONFIRM,
  SIGN,
  SUBMIT,
}

type FlowInput = {
  draft: Draft;
  initiator: AnyAccount | null;
  chain: Chain;
};

export type ConfirmInput = ExtrinsicConfirmInfo & {
  draft: Draft;
};

// --- Events ---

const flowStarted = createEvent<FlowInput>();
const flowFinished = createEvent();
const stepChanged = createEvent<Step>();

// --- Stores ---

const $step = readonly(restore(stepChanged, Step.NONE));
const $draft = createStore<Draft | null>(null).reset(flowFinished);
const $chain = createStore<Chain | null>(null).reset(flowFinished);
const $initiator = createStore<AnyAccount | null>(null).reset(flowFinished);
const $signatory = createEvent<AnyAccount | null>();
const $signatoryStore = createStore<AnyAccount | null>(null).reset(flowFinished);

$signatoryStore.on($signatory, (_, s) => s);

// --- Derived stores ---

const $api = combine($chain, networkModel.$apis, (chain, apis) => (chain ? (apis[chain.chainId] ?? null) : null));

const $transaction = $draft.map((draft): EncodedTransaction | null => {
  if (!draft?.callData) return null;

  return {
    type: 'encoded',
    callData: draft.callData as CallData,
  };
});

const $route = createRouteStore({
  chain: $chain,
  initiator: $initiator,
  signatory: $signatoryStore,
  accounts: walletModel.$availableAccounts,
});

const { $tx: $wrappedTx } = createWrappedTxStore({
  api: $api,
  transaction: $transaction,
  route: $route,
});

const $wrappedExtrinsic = createStore<SubmittableExtrinsic<'promise'> | null>(null).reset(flowFinished);
const $wrappedTxError = createStore(false).reset(flowFinished, flowStarted);

const createWrappedExtrinsicFx = createQueuedEffect(
  ({ transaction, api }: { transaction: AnyTransaction | null; api: ApiPromise | null }) => {
    if (nullable(transaction) || nullable(api)) return null;

    return transactionService.createExtrinsic(transaction, api);
  },
);

sample({
  source: { transaction: $wrappedTx, api: $api },
  target: createWrappedExtrinsicFx,
});

sample({
  clock: createWrappedExtrinsicFx.doneData,
  target: $wrappedExtrinsic,
});

sample({
  clock: createWrappedExtrinsicFx.fail,
  fn: () => null,
  target: $wrappedExtrinsic,
});

sample({
  clock: createWrappedExtrinsicFx.fail,
  fn: () => true,
  target: $wrappedTxError,
});

const { $: $fee } = createFeeCalculator({
  extrinsic: $wrappedExtrinsic,
});

const $signatories = createSignatoriesStore({
  chain: $chain,
  accounts: walletModel.$availableAccounts,
  initiator: $initiator,
});

// --- Confirm model ---

const confirmStore = createExtrinsicConfirmStore<ConfirmInput>({
  wallets: walletModel.$wallets,
});

const confirmModel = {
  $confirms: confirmStore.$confirms,
  init: confirmStore.init,
  startSigning: confirmStore.startSigning,
};

// --- Flow lifecycle ---

sample({
  clock: flowStarted,
  fn: ({ draft }) => draft,
  target: $draft,
});

sample({
  clock: flowStarted,
  fn: ({ chain }) => chain,
  target: $chain,
});

sample({
  clock: flowStarted,
  fn: ({ initiator }) => initiator,
  target: $initiator,
});

sample({
  clock: flowStarted,
  fn: () => Step.CONFIRM,
  target: stepChanged,
});

// Auto-select signatory when only one option
sample({
  clock: $signatories,
  filter: (signatories) => signatories.length === 1,
  fn: (signatories) => signatories.at(0) ?? null,
  target: $signatory,
});

// --- Step transitions ---

sample({
  clock: confirmModel.startSigning,
  fn: () => Step.SIGN,
  target: stepChanged,
});

sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: () => Step.SUBMIT,
  target: stepChanged,
});

sample({
  clock: flowFinished,
  fn: () => Step.NONE,
  target: stepChanged,
});

// --- Confirm → Sign → Submit ---

// When wrappedTx + fee are ready and step is CONFIRM, auto-init confirm
sample({
  clock: [flowStarted, $wrappedTx, $fee],
  source: {
    draft: $draft,
    wrappedTx: $wrappedTx,
    fee: $fee,
    api: $api,
    chain: $chain,
    initiator: $initiator,
    signatory: $signatoryStore,
    route: $route,
  },
  filter: (s) =>
    nonNullable(s.draft) &&
    nonNullable(s.wrappedTx) &&
    nonNullable(s.fee) &&
    nonNullable(s.api) &&
    nonNullable(s.chain) &&
    nonNullable(s.initiator),
  fn: (s) => {
    return [
      {
        api: s.api!,
        chain: s.chain!,
        transaction: s.wrappedTx!,
        initiator: s.initiator!,
        signatory: s.signatory || s.initiator!,
        route: s.route.length > 0 ? s.route : [s.signatory || s.initiator!],
        fee: s.fee!,
        draft: s.draft!,
      },
    ] satisfies ConfirmInput[];
  },
  target: confirmModel.init,
});

// SIGN step → pass signing payload to signModel
const sign = sample({
  clock: confirmModel.startSigning,
  source: {
    wrappedTx: $wrappedTx,
    api: $api,
    chain: $chain,
    signatory: $signatoryStore,
    initiator: $initiator,
  },
  fn({ wrappedTx, api, chain, signatory, initiator }) {
    if (nullable(api) || nullable(wrappedTx) || nullable(chain)) return null;
    const signer = signatory || initiator;
    if (nullable(signer)) return null;

    return {
      transaction: wrappedTx,
      signatory: signer,
      chain,
      api,
    } satisfies TransactionSigningPayload;
  },
});

sample({
  clock: sign.filter({ fn: nonNullable }),
  fn: (payload) => [payload],
  target: signModel.init,
});

// signed → submit
sample({
  clock: signModel.signed,
  source: $step,
  filter: (step) => step !== Step.NONE,
  fn: (_, payload) => payload,
  target: submitModel.init,
});

// --- Post-submit: create operation description ---

const postSubmitFx = createEffect(
  async ({
    draft,
    initiator,
    callHash,
    timepoint,
    baseUrl,
  }: {
    draft: Draft;
    initiator: AnyAccount;
    callHash: string;
    timepoint: { height: number; index: number };
    baseUrl: string;
  }) => {
    await operationsService.createDescription(baseUrl, {
      multisigAccountId: draft.multisigAccountId ?? initiator.accountId,
      chainId: draft.chainId,
      callHash,
      blockNumber: timepoint.height,
      extrinsicIndex: timepoint.index,
      description: draft.description ?? '',
      draftId: draft.id,
    });

    const multisigAccountId = draft.multisigAccountId ?? initiator.accountId;
    const operationId = `${draft.chainId}-${callHash}-${multisigAccountId}-${timepoint.height}-${timepoint.index}`;

    return { operationId, description: draft.description ?? '', draftId: draft.id };
  },
);

sample({
  clock: submitModel.done,
  source: {
    draft: $draft,
    chain: $chain,
    initiator: $initiator,
    wrappedExtrinsic: $wrappedExtrinsic,
    api: $api,
    baseUrl: backendConfigurationModel.$backendUrl,
  },
  filter: (s, results) => {
    const hasSuccess = results.some((r) => r.result === ExtrinsicResult.SUCCESS);

    return hasSuccess && nonNullable(s.draft) && nonNullable(s.chain) && nonNullable(s.baseUrl);
  },
  fn: (s, results) => {
    const successResult = results.find((r) => r.result === ExtrinsicResult.SUCCESS) as SuccessResult;
    const timepoint = successResult.params.timepoint;

    // Compute callHash from the original call data
    let callHash = '';
    if (s.wrappedExtrinsic && s.api) {
      try {
        callHash = s.api.createType('Call', s.draft!.callData).hash.toHex();
      } catch {
        // fallback: use extrinsic hash
        callHash = successResult.params.extrinsicHash;
      }
    }

    return {
      draft: s.draft!,
      initiator: s.initiator!,
      callHash,
      timepoint,
      baseUrl: s.baseUrl!,
    };
  },
  target: postSubmitFx,
});

sample({
  clock: postSubmitFx.doneData,
  fn: ({ operationId, description, draftId }) => ({ id: operationId, description, draftId }),
  target: operationDescriptionsResource.descriptionCreated,
});

// --- Post-submit success toast ---

const showSubmitSuccessToastFx = createEffect(() => {
  toast.success(t('operations.drafts.submitSuccess'));
});

sample({
  clock: submitModel.done,
  source: $draft,
  filter: (draft, results) => nonNullable(draft) && results.some((r) => r.result === ExtrinsicResult.SUCCESS),
  fn: (draft) => draft!.id,
  target: showSubmitSuccessToastFx,
});

// --- Session-only: track drafts submitted this session (show "Submitted" badge until backend confirms) ---

const $submittedDraftIds = createStore<Set<string>>(new Set());

sample({
  clock: submitModel.done,
  source: { draft: $draft, current: $submittedDraftIds },
  filter: ({ draft }, results) => nonNullable(draft) && results.some((r) => r.result === ExtrinsicResult.SUCCESS),
  fn: ({ draft, current }) => new Set([...current, draft!.id]),
  target: $submittedDraftIds,
});

// --- Post-submit sync error: toast with retry ---

const showSyncErrorToastFx = createEffect(
  (params: {
    draft: Draft;
    initiator: AnyAccount;
    callHash: string;
    timepoint: { height: number; index: number };
    baseUrl: string;
  }) => {
    toast.error(t('operations.drafts.syncError'), {
      action: {
        label: t('operations.drafts.syncRetry'),
        onClick: () => postSubmitFx(params),
      },
    });
  },
);

sample({
  clock: postSubmitFx.fail,
  fn: ({ params }) => params,
  target: showSyncErrorToastFx,
});

// --- Exports ---

export const submitDraftModel = {
  $step,
  $draft,
  $chain,
  $initiator,
  $signatoryStore,
  $signatories,
  $fee,
  $wrappedTx,
  $wrappedExtrinsic,
  $wrappedTxError,
  $submittedDraftIds,

  flowStarted,
  flowFinished,
  signatoryChanged: $signatory,

  confirmModel,

  Step,
};
