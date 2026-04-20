import { isHex } from '@polkadot/util';
import { combine, createEvent, createStore, sample } from 'effector';

import { type Address, type Chain, type ChainId, type WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { networkModel } from '@/entities/network';

export type Step = 'call-data' | 'select-multisig' | 'confirm';

export const STEPS_ORDER: Step[] = ['call-data', 'select-multisig', 'confirm'];

export type DraftAccountOption = {
  accountId: AccountId;
  name: string;
  chainId?: ChainId;
  signatories?: AccountId[];
  threshold?: number;
  walletType: WalletType | null;
  address: Address;
  /**
   * True when this contact is not a multisig itself, but at least one multisig
   * can sign on its behalf (proxy relationship).
   */
  isProxy: boolean;
  /**
   * AccountIds of multisigs (present in address book) that can sign for this
   * contact via proxy.
   */
  signerMultisigIds?: AccountId[];
};

export type DraftSeed = {
  callData?: string;
  chainId?: ChainId;
  description?: string;
  inputMode?: 'paste' | 'build';
  source?: string;
};

const createDraftRequested = createEvent<DraftSeed | void>();
const modalClosed = createEvent();
const stepAdvanced = createEvent();
const stepReverted = createEvent();
const skipPressed = createEvent();
const callDataChanged = createEvent<string>();
const inputModeChanged = createEvent<'paste' | 'build'>();
const chainSelected = createEvent<Chain | null>();
const accountSelected = createEvent<DraftAccountOption | null>();
const proxyMultisigSelected = createEvent<DraftAccountOption | null>();
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

const $selectedAccount = createStore<DraftAccountOption | null>(null)
  .on(accountSelected, (_, a) => a)
  .on(chainSelected, () => null)
  .reset(modalClosed);

const $selectedMultisigForProxy = createStore<DraftAccountOption | null>(null)
  .on(proxyMultisigSelected, (_, a) => a)
  .on(accountSelected, () => null)
  .on(chainSelected, () => null)
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

const $effectiveChain = combine(
  { account: $selectedAccount, chain: $selectedChain, chains: networkModel.$chains },
  ({ account, chain, chains }) => (account?.chainId ? (chains[account.chainId] ?? null) : chain),
);

const $isProxySelected = $selectedAccount.map((acc) => !!acc?.isProxy);

const $callDataErrorKey = $callData.map((hex) =>
  hex.length > 0 && !isHex(hex) ? ('operations.drafts.callDataErrorHex' as const) : null,
);

const $isDirty = combine(
  { chain: $selectedChain, account: $selectedAccount, callData: $callData, description: $description },
  ({ chain, account, callData, description }) =>
    chain !== null || account !== null || callData.length > 0 || description.length > 0,
);

const $canContinue = combine(
  {
    step: $activeStep,
    chain: $effectiveChain,
    callData: $callData,
    errorKey: $callDataErrorKey,
    account: $selectedAccount,
    proxyMultisig: $selectedMultisigForProxy,
    isProxy: $isProxySelected,
  },
  ({ step, chain, callData, errorKey, account, proxyMultisig, isProxy }) => {
    if (step === 'call-data') return !!chain && callData.length > 0 && errorKey === null;
    if (step === 'select-multisig') return !!account && (!isProxy || !!proxyMultisig);

    return step === 'confirm';
  },
);

const $canSkip = combine($activeStep, $effectiveChain, (step, chain) => step === 'call-data' && !!chain);

export const createDraftModel = {
  createDraftRequested,
  modalClosed,
  stepAdvanced,
  stepReverted,
  skipPressed,
  callDataChanged,
  inputModeChanged,
  chainSelected,
  accountSelected,
  proxyMultisigSelected,
  descriptionChanged,
  $isOpen,
  $activeStep,
  $callData,
  $inputMode,
  $selectedChain,
  $selectedAccount,
  $selectedMultisigForProxy,
  $description,
  $effectiveChain,
  $isProxySelected,
  $callDataErrorKey,
  $isDirty,
  $canContinue,
  $canSkip,
};
