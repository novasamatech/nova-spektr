import { combine, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { isHex } from '@/shared/lib/utils';
import { AssetHubChains } from '@/domains/staking';
import { networkModel } from '@/entities/network';
import { graphModel, pathModel } from '@/features/signing-path';

export type Step = 'call-data' | 'select-path' | 'confirm';

export const STEPS_ORDER: Step[] = ['call-data', 'select-path', 'confirm'];

export const DESCRIPTION_MAX_LENGTH = 500;

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
  $isOpen,
  $activeStep,
  $callData,
  $inputMode,
  $selectedChain,
  $description,
  $callDataErrorKey,
  $isDescriptionTooLong,
  $isDirty,
  $canContinue,
  $canSkip,
};
