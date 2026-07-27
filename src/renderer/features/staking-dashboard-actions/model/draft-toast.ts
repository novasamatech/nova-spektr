import { type BN } from '@polkadot/util';
import { type Event, type Store, createEvent, createStore, sample } from 'effector';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { type AmountFlowMode } from '@/features/staking-amount-flow';
import { findWallet } from '../lib/resolve';

export type DraftToastOperation = 'claim' | AmountFlowMode;

/** Everything frame F10's line says, resolved down to plain values. */
export type DraftToastContext = {
  operation: DraftToastOperation;
  chain: Chain;
  asset: Asset;
  /** Planck the saved call moves. */
  amount: string;
  /** Whoever has to open Drafts and sign it. */
  signerAccountId: AccountId | null;
  signerWallet: Wallet | null;
};

type FlowSnapshot = {
  chain: Chain | null;
  asset: Asset | null;
  amount: string;
  initiator: AnyAccount | null;
  path: PathNode[];
};

export type DraftToastDeps = {
  claimFlow: {
    saveAsDraftRequested: Event<void>;
    /** Reopening the flow invalidates whatever the last attempt described. */
    claimRequested: Event<unknown>;
    $initiatedDraft: Store<boolean>;
    $chain: Store<Chain | null>;
    $asset: Store<Asset | null>;
    $totalAmount: Store<string>;
    $initiator: Store<AnyAccount | null>;
    $draftSigningPath: Store<PathNode[]>;
  };
  amountFlow: {
    saveAsDraftRequested: Event<void>;
    flowStarted: Event<unknown>;
    $initiatedDraft: Store<boolean>;
    $mode: Store<AmountFlowMode | null>;
    $chain: Store<Chain | null>;
    $asset: Store<Asset | null>;
    $amountPlanck: Store<BN>;
    $initiator: Store<AnyAccount | null>;
    $draftSigningPath: Store<PathNode[]>;
  };
  $accounts: Store<AnyAccount[]>;
  $wallets: Store<Wallet[]>;
  /** Fires for every draft the app creates, whoever asked for it. */
  draftCreated: Event<void>;
};

function buildContext(
  operation: DraftToastOperation,
  { chain, asset, amount, initiator, path }: FlowSnapshot,
  accounts: AnyAccount[],
  wallets: Wallet[],
): DraftToastContext | null {
  if (nullable(chain) || nullable(asset)) return null;

  // The last node of a draft's path is the account that will sign it — that is
  // who the toast names, because that is who has to act.
  const signerAccountId = path.at(-1)?.accountId ?? initiator?.accountId ?? null;
  const signerAccount = nonNullable(signerAccountId)
    ? (accounts.find((account) => account.accountId === signerAccountId) ?? null)
    : null;

  return {
    operation,
    chain,
    asset,
    amount,
    signerAccountId,
    signerWallet: findWallet(signerAccount, wallets),
  };
}

/**
 * The draft-confirmation toast (frame F10).
 *
 * A draft is the one outcome of a staking action that leaves nothing on screen:
 * the flow closes, no confirmation lands, and the operation is sitting in
 * Drafts waiting for someone else. The toast is what says so — non-blocking,
 * auto-dismissing, with a link to the surface that holds it.
 *
 * What it describes is snapshotted when the user presses **Save as draft**, not
 * when the draft comes back. `createDraftModel.draftCreated` closes the flow
 * through `wireDraftCloseRedirect`, which resets the very stores the line is
 * built from; reading them at that point would describe an empty flow.
 */
export const createDraftToast = ({ claimFlow, amountFlow, $accounts, $wallets, draftCreated }: DraftToastDeps) => {
  const toastShown = createEvent();

  const claimSnapshot = sample({
    clock: claimFlow.saveAsDraftRequested,
    source: {
      chain: claimFlow.$chain,
      asset: claimFlow.$asset,
      amount: claimFlow.$totalAmount,
      initiator: claimFlow.$initiator,
      path: claimFlow.$draftSigningPath,
      accounts: $accounts,
      wallets: $wallets,
    },
    fn: ({ accounts, wallets, ...snapshot }) => buildContext('claim', snapshot, accounts, wallets),
  });

  const amountSnapshot = sample({
    clock: amountFlow.saveAsDraftRequested,
    source: {
      mode: amountFlow.$mode,
      chain: amountFlow.$chain,
      asset: amountFlow.$asset,
      amount: amountFlow.$amountPlanck,
      initiator: amountFlow.$initiator,
      path: amountFlow.$draftSigningPath,
      accounts: $accounts,
      wallets: $wallets,
    },
    fn: ({ mode, amount, accounts, wallets, ...snapshot }) =>
      nullable(mode) ? null : buildContext(mode, { ...snapshot, amount: amount.toString() }, accounts, wallets),
  });

  /**
   * The last thing a staking flow asked to save. Cleared once it has been
   * announced, and whenever a flow reopens — a failed save must not describe
   * the next unrelated draft the user creates by hand.
   */
  const $pending = createStore<DraftToastContext | null>(null)
    .on([claimSnapshot, amountSnapshot], (_, context) => context)
    .reset(claimFlow.claimRequested, amountFlow.flowStarted);

  /**
   * A draft landed _and_ one of the staking flows is the one that asked for it.
   * `$initiatedDraft` survives `draftCreated` on purpose (it resets on flow
   * boundaries), so it is still true when read here.
   */
  const draftToastRaised = sample({
    clock: draftCreated,
    source: {
      pending: $pending,
      claimInitiated: claimFlow.$initiatedDraft,
      amountInitiated: amountFlow.$initiatedDraft,
    },
  }).filterMap(({ pending, claimInitiated, amountInitiated }) =>
    nonNullable(pending) && (claimInitiated || amountInitiated) ? pending : undefined,
  );

  $pending.reset(draftToastRaised);

  /** What the view has not announced yet. `null` means nothing to show. */
  const $toast = createStore<DraftToastContext | null>(null)
    .on(draftToastRaised, (_, context) => context)
    .reset(toastShown);

  return {
    $toast,
    toastShown,
  };
};
