import { isHex } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { networkModel } from '@/entities/network';

import { pathModel } from './path-model';

export type Step = 'call-data' | 'select-path' | 'confirm';

export const STEPS_ORDER: Step[] = ['call-data', 'select-path', 'confirm'];

export type DraftSeed = {
  callData?: string;
  chainId?: ChainId;
  description?: string;
  inputMode?: 'paste' | 'build';
  source?: string;
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
const submitClicked = createEvent();

const advance = (s: Step) => STEPS_ORDER[Math.min(STEPS_ORDER.indexOf(s) + 1, STEPS_ORDER.length - 1)] ?? s;
const revert = (s: Step) => STEPS_ORDER[Math.max(STEPS_ORDER.indexOf(s) - 1, 0)] ?? s;

const $isOpen = createStore(false)
  .on(createDraftRequested, () => true)
  .reset(modalClosed);

const $activeStep = createStore<Step>('call-data')
  .on(createDraftRequested, () => 'call-data' as Step)
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

// Seed wiring
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

// Reset path on chain change or modal close
sample({ clock: [chainSelected, modalClosed], target: pathModel.pathReset });

// Derived stores
const $effectiveChain = $selectedChain;

const $callDataErrorKey = $callData.map((hex) =>
  hex.length > 0 && !isHex(hex) ? ('operations.drafts.callDataErrorHex' as const) : null,
);

const $isDirty = combine(
  { chain: $selectedChain, path: pathModel.$path, callData: $callData, description: $description },
  ({ chain, path, callData, description }) =>
    chain !== null || path.length > 0 || callData.length > 0 || description.length > 0,
);

const $canContinue = combine(
  {
    step: $activeStep,
    chain: $effectiveChain,
    callData: $callData,
    errorKey: $callDataErrorKey,
    pathComplete: pathModel.$isComplete,
    description: $description,
  },
  ({ step, chain, callData, errorKey, pathComplete, description }) => {
    if (step === 'call-data') return !!chain && callData.length > 0 && errorKey === null;
    if (step === 'select-path') return pathComplete;

    return step === 'confirm' && description.trim().length > 0;
  },
);

const $canSkip = combine($activeStep, $effectiveChain, (step, chain) => step === 'call-data' && !!chain);

export const createDraftModel = {
  // events
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
  submitClicked,
  // stores
  $isOpen,
  $activeStep,
  $callData,
  $inputMode,
  $selectedChain,
  $description,
  $effectiveChain,
  $callDataErrorKey,
  $isDirty,
  $canContinue,
  $canSkip,
};
