import { type Event, type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { type AmountFlowMode } from '@/features/staking-amount-flow';
import { type ConfirmFlowMode } from '@/features/staking-confirm-flow';
import { findWallet } from '../lib/resolve';

export type DraftToastOperation = 'claim' | AmountFlowMode | ConfirmFlowMode;

/** Everything frame F10's line says, resolved down to plain values. */
export type DraftToastContext = {
  operation: DraftToastOperation;
  chain: Chain;
  asset: Asset;
  /** Planck the saved call moves. `'0'` when it moves nothing. */
  amount: string;
  /** Whoever has to open Drafts and sign it. */
  signerAccountId: AccountId | null;
  signerWallet: Wallet | null;
};

/**
 * One staking flow, as far as the toast is concerned.
 *
 * Every flow that can save a draft looks the same from here: it says what it
 * was asked to do, on which network, for how much, and who will have to sign
 * it. Keeping that a list rather than a named block per flow is what lets a new
 * staking action join the toast by being bound in `model/instance.ts`, with
 * nothing to change here.
 */
export type DraftToastFlow = {
  saveAsDraftRequested: Event<void>;
  /** Reopening the flow invalidates whatever the last attempt described. */
  flowStarted: Event<unknown>;
  $initiatedDraft: Store<boolean>;
  /** `null` while the flow is idle and holds no operation. */
  $operation: Store<DraftToastOperation | null>;
  $chain: Store<Chain | null>;
  $asset: Store<Asset | null>;
  /** Planck the saved call moves, as a decimal string. */
  $amount: Store<string>;
  $initiator: Store<AnyAccount | null>;
  $draftSigningPath: Store<PathNode[]>;
};

export type DraftToastDeps = {
  flows: DraftToastFlow[];
  $accounts: Store<AnyAccount[]>;
  $wallets: Store<Wallet[]>;
  /** Fires for every draft the app creates, whoever asked for it. */
  draftCreated: Event<void>;
};

type FlowSnapshot = {
  operation: DraftToastOperation | null;
  chain: Chain | null;
  asset: Asset | null;
  amount: string;
  initiator: AnyAccount | null;
  path: PathNode[];
};

function buildContext(
  { operation, chain, asset, amount, initiator, path }: FlowSnapshot,
  accounts: AnyAccount[],
  wallets: Wallet[],
): DraftToastContext | null {
  if (nullable(operation) || nullable(chain) || nullable(asset)) return null;

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
export const createDraftToast = ({ flows, $accounts, $wallets, draftCreated }: DraftToastDeps) => {
  const toastShown = createEvent();

  const snapshots = flows.map((flow) =>
    sample({
      clock: flow.saveAsDraftRequested,
      source: {
        operation: flow.$operation,
        chain: flow.$chain,
        asset: flow.$asset,
        amount: flow.$amount,
        initiator: flow.$initiator,
        path: flow.$draftSigningPath,
        accounts: $accounts,
        wallets: $wallets,
      },
      fn: ({ accounts, wallets, ...snapshot }) => buildContext(snapshot, accounts, wallets),
    }),
  );

  /**
   * The last thing a staking flow asked to save. Cleared once it has been
   * announced, and whenever a flow reopens — a failed save must not describe
   * the next unrelated draft the user creates by hand.
   */
  const $pending = createStore<DraftToastContext | null>(null)
    .on(snapshots, (_, context) => context)
    .reset(flows.map((flow) => flow.flowStarted));

  /**
   * A draft landed _and_ one of the staking flows is the one that asked for it.
   * `$initiatedDraft` survives `draftCreated` on purpose (it resets on flow
   * boundaries), so it is still true when read here.
   */
  const draftToastRaised = sample({
    clock: draftCreated,
    source: {
      pending: $pending,
      initiated: combine(flows.map((flow) => flow.$initiatedDraft)),
    },
  }).filterMap(({ pending, initiated }) => (nonNullable(pending) && initiated.some(Boolean) ? pending : undefined));

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
