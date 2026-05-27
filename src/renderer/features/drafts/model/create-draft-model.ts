import { combine, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { isHex } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { deriveMultisigAccountId, graphModel, pathModel } from '@/features/signing-path';
import { deriveFinalSignerCandidates } from '../lib/final-signer-candidates';

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
const finalSignerToggled = createEvent<boolean>();
const finalSignerSelected = createEvent<AccountId | null>();

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

// Optional "Final Signer" hint — only meaningful when the path has a multisig.
const $isFinalSignerEnabled = createStore(false)
  .on(finalSignerToggled, (_, enabled) => enabled)
  .reset(modalClosed);

const $finalSignerAccountId = createStore<AccountId | null>(null)
  .on(finalSignerSelected, (_, accountId) => accountId)
  .reset(modalClosed);

const $canHaveFinalSigner = pathModel.$path.map((path) => deriveMultisigAccountId(path) !== null);

const $finalSignerCandidates = combine(pathModel.$path, graphModel.$multisigByAccountId, (path, multisigByAccountId) =>
  deriveFinalSignerCandidates(path, multisigByAccountId),
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

// Disable the toggle once the path can no longer host a final signer (e.g. the
// user edited away the multisig). Clock on the source `$path` store rather than
// the derived `$canHaveFinalSigner` — a derived store as a sample clock isn't
// scope-local across forks. Routed through `finalSignerToggled(false)` so the
// selection-clearing sample below fires too.
sample({
  clock: pathModel.$path,
  filter: (path) => deriveMultisigAccountId(path) === null,
  fn: () => false,
  target: finalSignerToggled,
});

// Unchecking (manual or auto) clears any selected final signer.
sample({
  clock: finalSignerToggled,
  filter: (enabled) => !enabled,
  fn: () => null,
  target: finalSignerSelected,
});

// Drop a selection that's no longer a valid candidate (path edited beneath it).
// Clock on `$path` (source store) for the same scope-locality reason as above.
sample({
  clock: pathModel.$path,
  source: { selected: $finalSignerAccountId, multisigByAccountId: graphModel.$multisigByAccountId },
  filter: ({ selected, multisigByAccountId }, path) =>
    selected !== null && !deriveFinalSignerCandidates(path, multisigByAccountId).includes(selected),
  fn: () => null,
  target: finalSignerSelected,
});

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
  },
  ({ step, chain, callData, errorKey, pathComplete, description }) => {
    if (step === 'call-data') return !!chain && callData.length > 0 && errorKey === null;
    if (step === 'select-path') return pathComplete;

    return step === 'confirm' && description.trim().length > 0 && description.length <= DESCRIPTION_MAX_LENGTH;
  },
);

const $canSkip = combine($activeStep, $selectedChain, (step, chain) => step === 'call-data' && !!chain);

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
  finalSignerToggled,
  finalSignerSelected,
  $isOpen,
  $activeStep,
  $callData,
  $inputMode,
  $selectedChain,
  $description,
  $isFinalSignerEnabled,
  $finalSignerAccountId,
  $canHaveFinalSigner,
  $finalSignerCandidates,
  $callDataErrorKey,
  $isDescriptionTooLong,
  $isDirty,
  $canContinue,
  $canSkip,
};
