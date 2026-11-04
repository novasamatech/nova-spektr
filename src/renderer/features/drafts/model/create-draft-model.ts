import { attach, combine, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { isHex } from '@/shared/lib/utils';
import { type PathNode, draftsResource, draftsService } from '@/domains/backend';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { backendConfigurationModel } from '@/aggregates/backend';
import { recipientVerificationModel } from '@/aggregates/recipient-verification';
import {
  deriveInitiatorAccountId,
  deriveMultisigAccountId,
  graphModel,
  isUsablePath,
  isValidPath,
  pathModel,
} from '@/features/signing-path';
import { decodeDraftTransaction, getPathOriginAccountId } from '../lib/decode-draft-transaction';
import { getRecipientAccountIds, getRecipientCheck } from '../lib/recipient-check';

export type Step = 'call-data' | 'select-path' | 'confirm';

export const STEPS_ORDER: Step[] = ['call-data', 'select-path', 'confirm'];

export const DESCRIPTION_MAX_LENGTH = 500;

export type DraftSeed = {
  callData?: string;
  chainId?: ChainId;
  description?: string;
  inputMode?: 'paste' | 'build';
  source?: string;
  /**
   * Pre-built signing path for the operation. When present (and complete +
   * matches the provided chain + call data is valid), the modal jumps directly
   * to the `confirm` step so the user only needs to fill in a description.
   */
  path?: PathNode[];
};

const seedHasCompletePath = (seed: DraftSeed | void): boolean =>
  !!seed && Array.isArray(seed.path) && seed.path.length > 0 && seed.path[seed.path.length - 1]?.kind === 'signer';

const seedHasValidCallData = (seed: DraftSeed | void): boolean =>
  !!seed && typeof seed.callData === 'string' && seed.callData.length > 0 && isHex(seed.callData);

const seedHasChain = (seed: DraftSeed | void): boolean => !!seed && !!seed.chainId;

const deriveInitialStep = (seed: DraftSeed | void): Step => {
  if (seedHasChain(seed) && seedHasValidCallData(seed) && seedHasCompletePath(seed)) return 'confirm';
  if (seedHasChain(seed) && seedHasValidCallData(seed)) return 'select-path';
  return 'call-data';
};

const createDraftRequested = createEvent<DraftSeed | void>();
const modalClosed = createEvent();
const draftCreated = createEvent();
const stepAdvanced = createEvent();
const stepReverted = createEvent();
const skipPressed = createEvent();
const callDataChanged = createEvent<string>();
const inputModeChanged = createEvent<'paste' | 'build'>();
const chainSelected = createEvent<Chain | null>();
const descriptionChanged = createEvent<string>();
const riskAcknowledgedToggled = createEvent<boolean>();

const advance = (s: Step) => STEPS_ORDER[Math.min(STEPS_ORDER.indexOf(s) + 1, STEPS_ORDER.length - 1)] ?? s;
const revert = (s: Step) => STEPS_ORDER[Math.max(STEPS_ORDER.indexOf(s) - 1, 0)] ?? s;

const $isOpen = createStore(false)
  .on(createDraftRequested, () => true)
  .reset(modalClosed);

const $activeStep = createStore<Step>('call-data')
  .on(createDraftRequested, (_, seed) => deriveInitialStep(seed))
  .on(stepAdvanced, advance)
  .on(stepReverted, revert)
  .on(skipPressed, advance)
  .reset(modalClosed);

const $callData = createStore<string>('')
  .on(callDataChanged, (_, hex) => hex)
  .on(skipPressed, () => '')
  .on(chainSelected, () => '')
  .reset(modalClosed);

const $inputMode = createStore<'paste' | 'build'>('paste')
  .on(inputModeChanged, (_, m) => m)
  .reset(modalClosed);

const $selectedChain = createStore<Chain | null>(null)
  .on(chainSelected, (_, c) => c)
  .reset(modalClosed);

const $description = createStore<string>('')
  .on(descriptionChanged, (_, d) => d)
  .reset(modalClosed);

// Unknown-recipient acknowledgement for the confirm step. Anything that can
// change the recipient — new call data, another chain, a new flow — clears it
// so a tick never silently carries over to a different address.
const $isRiskAcknowledged = createStore(false)
  .on(riskAcknowledgedToggled, (_, checked) => checked)
  .reset([createDraftRequested, modalClosed, callDataChanged, chainSelected]);

// --- Unknown recipient gate ---

const $api = combine($selectedChain, networkModel.$apis, (chain, apis) =>
  chain ? (apis[chain.chainId] ?? null) : null,
);

const $decodedTransaction = combine(
  { callData: $callData, path: pathModel.$path, api: $api, chain: $selectedChain },
  ({ callData, path, api, chain }) =>
    decodeDraftTransaction({ callData, originAccountId: getPathOriginAccountId(path), api, chain }),
);

const $recipientCheck = $decodedTransaction.map(getRecipientCheck);

const $destinationAccountIds = $recipientCheck.map(getRecipientAccountIds);

const $recipientWarning = combine(
  recipientVerificationModel.$resolveCheckWarning,
  $recipientCheck,
  (resolveWarning, recipientCheck) => resolveWarning(recipientCheck),
);

// "Can't check" is not "nothing to check": with call data on hand but no chain
// api, the recipient is simply unknown — never silently treated as safe.
const $isRecipientCheckable = combine(
  { mode: recipientVerificationModel.$mode, callData: $callData, api: $api },
  ({ mode, callData, api }) => mode === 'off' || callData.length === 0 || api !== null,
);

const $recipientRiskAccepted = combine(
  { warning: $recipientWarning, acknowledged: $isRiskAcknowledged, checkable: $isRecipientCheckable },
  ({ warning, acknowledged, checkable }) => checkable && (warning === 'none' || acknowledged),
);

sample({
  clock: createDraftRequested,
  filter: (seed): seed is DraftSeed => !!seed && seed.callData !== undefined,
  fn: (seed) => seed!.callData ?? '',
  target: $callData,
});

sample({
  clock: createDraftRequested,
  source: networkModel.$chains,
  filter: (_, seed) => !!seed && !!seed.chainId,
  fn: (chains, seed) => chains[seed!.chainId!] ?? null,
  target: $selectedChain,
});

sample({
  clock: createDraftRequested,
  source: { chains: networkModel.$chains, chainsList: networkModel.$chainsList },
  filter: (_, seed) => !seed || !seed.chainId,
  fn: ({ chains, chainsList }) => chains[AssetHubChains.POLKADOT_AH] ?? chainsList[0] ?? null,
  target: $selectedChain,
});

sample({
  clock: createDraftRequested,
  filter: (seed): seed is DraftSeed => !!seed && seed.description !== undefined,
  fn: (seed) => seed!.description ?? '',
  target: $description,
});

sample({
  clock: createDraftRequested,
  filter: (seed): seed is DraftSeed => !!seed && seed.inputMode !== undefined,
  fn: (seed) => seed!.inputMode!,
  target: $inputMode,
});

// Pre-fill the signing-path picker from the seed. Runs synchronously alongside
// the chain/call-data seeding so the next-tick chainSelected reset (below)
// can't fire on it — the seed only carries a path when the caller already set
// the chain explicitly.
sample({
  clock: createDraftRequested,
  filter: seedHasCompletePath,
  fn: (seed) => seed!.path!,
  target: pathModel.pathSeeded,
});

sample({
  clock: [chainSelected, modalClosed],
  source: pathModel.$path,
  filter: (path) => path.length > 0,
  target: pathModel.pathReset,
});

sample({ clock: modalClosed, target: graphModel.cachesCleared });

const $callDataErrorKey = $callData.map((hex) =>
  hex.length > 0 && !isHex(hex) ? ('operations.drafts.callDataErrorHex' as const) : null,
);

const $isDescriptionTooLong = $description.map((d) => d.length > DESCRIPTION_MAX_LENGTH);

const $isDirty = combine(
  { chain: $selectedChain, path: pathModel.$path, callData: $callData, description: $description },
  ({ chain, path, callData, description }) =>
    chain !== null || path.length > 0 || callData.length > 0 || description.length > 0,
);

const $canContinue = combine(
  {
    step: $activeStep,
    chain: $selectedChain,
    callData: $callData,
    errorKey: $callDataErrorKey,
    pathComplete: pathModel.$isComplete,
    description: $description,
    riskAccepted: $recipientRiskAccepted,
  },
  ({ step, chain, callData, errorKey, pathComplete, description, riskAccepted }) => {
    if (step === 'call-data') return !!chain && callData.length > 0 && errorKey === null;
    if (step === 'select-path') return pathComplete;

    return (
      step === 'confirm' &&
      description.trim().length > 0 &&
      description.length <= DESCRIPTION_MAX_LENGTH &&
      // The unknown-recipient acknowledgement is part of the confirm gate, not
      // only of the button: a draft is never created past an unticked box.
      riskAccepted
    );
  },
);

const $canSkip = combine($activeStep, $selectedChain, (step, chain) => step === 'call-data' && !!chain);

export type DraftNotCreatedReason = 'not-ready' | 'invalid-path';

/**
 * The create action refused: the gate in front of the backend call was closed
 * when it ran. `reason` says which part of it — the confirm as a whole, or the
 * signing path in particular — so the caller can tell the user why nothing
 * happened.
 */
export class DraftNotCreatedError extends Error {
  constructor(
    readonly reason: DraftNotCreatedReason,
    /** What exactly is wrong with the path, when the validator says. */
    readonly detail?: string,
  ) {
    super(`Draft not created: ${reason}`);
    this.name = 'DraftNotCreatedError';
  }
}

type CreateRequest =
  | { ok: true; backendUrl: string; params: Parameters<typeof draftsService.createDraft>[1] }
  | { ok: false; reason: DraftNotCreatedReason; detail?: string };

/**
 * Everything the create call needs, or why it cannot be made — the confirm gate
 * included, so the backend is never asked for a draft the modal would not let
 * the user create.
 */
const $createRequest = combine(
  {
    canContinue: $canContinue,
    backendUrl: backendConfigurationModel.$backendUrl,
    chain: $selectedChain,
    path: pathModel.$path,
    callData: $callData,
    description: $description,
  },
  ({ canContinue, backendUrl, chain, path, callData, description }): CreateRequest => {
    if (!canContinue || !backendUrl || !chain) return { ok: false, reason: 'not-ready' };

    // A lone `signer` is grammatically valid, but a draft along it could never
    // be submitted — the signing path needs at least one delegation hop.
    const validation = isValidPath(path);
    if (!validation.ok || !isUsablePath(path)) {
      return { ok: false, reason: 'invalid-path', detail: validation.ok ? undefined : validation.reason };
    }

    return {
      ok: true,
      backendUrl,
      params: {
        chainId: chain.chainId,
        multisigAccountId: deriveMultisigAccountId(path) ?? undefined,
        proxyAccountId: path[0]?.kind === 'proxied' ? path[0].accountId : undefined,
        signingPath: path,
        initiatorAccountId: deriveInitiatorAccountId(path) ?? undefined,
        callData: callData || undefined,
        description: description || undefined,
      },
    };
  },
);

/**
 * The create action. An effect so the modal can await it for its toasts; the
 * gate lives inside, so a call while the confirm is not ready creates nothing
 * and fails with a {@link DraftNotCreatedError} — the button's `disabled` is not
 * the only thing standing in the way, and a gate that closed after the click
 * still says why.
 */
const createDraftFx = attach({
  source: $createRequest,
  effect: async (request) => {
    if (!request.ok) throw new DraftNotCreatedError(request.reason, request.detail);

    return draftsService.createDraft(request.backendUrl, request.params);
  },
});

sample({
  clock: createDraftFx.doneData,
  target: [draftsResource.draftCreated, draftCreated],
});

export const createDraftModel = {
  createDraftRequested,
  modalClosed,
  draftCreated,
  stepAdvanced,
  stepReverted,
  skipPressed,
  callDataChanged,
  inputModeChanged,
  chainSelected,
  descriptionChanged,
  riskAcknowledgedToggled,
  $isOpen,
  $activeStep,
  $callData,
  $inputMode,
  $selectedChain,
  $description,
  $isRiskAcknowledged,
  $decodedTransaction,
  $destinationAccountIds,
  $recipientWarning,
  $isRecipientCheckable,
  $recipientRiskAccepted,
  $callDataErrorKey,
  $isDescriptionTooLong,
  $isDirty,
  $canContinue,
  $canSkip,
  createDraftFx,
};
