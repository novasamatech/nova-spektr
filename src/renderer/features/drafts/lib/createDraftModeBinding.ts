import { type Event, type Store, createEvent, createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { pathModel } from '@/features/signing-path';
import { createDraftModel } from '../model/create-draft-model';

type FactoryOpts = {
  /** Reset clock for `$isDraftMode`, `$draftSigningPath`, and `$initiatedDraft`. */
  formInitiated: Event<unknown>;
  /** Reset clock for `$draftSigningPath` (path becomes stale on chain switch). */
  chainChanged: Event<unknown>;
};

type ConnectSaveOpts = {
  /** Tracing tag forwarded to `createDraftModel` (e.g. `'transfer-draft-mode'`). */
  source: string;
  /** Hex-encoded call data of the draft transaction the host computes. */
  $callDataHex: Store<string | null>;
  /** Network bundle (chain + asset) the host already exposes. */
  $networkStore: Store<{ chain: { chainId: ChainId } } | null>;
  /** Final gate the host enforces before a save is actually accepted. */
  $canSave: Store<boolean>;
};

/**
 * Shared draft-mode state machine for transaction-builder flows. Each flow owns
 * its toggle store, its draft signing-path mirror, and the `$initiatedDraft`
 * marker — the factory wires them up identically so flows stay one-liners.
 *
 * Usage:
 *
 * ```ts
 * const draftMode = createDraftModeBinding({
 *   formInitiated,
 *   chainChanged,
 * });
 * // ...flow computes $draftCoreTx using draftMode.$draftSigningPath...
 * draftMode.connectSave({ source, $callDataHex, $networkStore, $canSave });
 * ```
 */
export const createDraftModeBinding = ({ formInitiated, chainChanged }: FactoryOpts) => {
  const draftModeToggled = createEvent<boolean | null>();
  const $isDraftMode = createStore(false)
    .on(draftModeToggled, (state, update) => (nonNullable(update) ? update : !state))
    .reset(formInitiated);

  const saveAsDraftRequested = createEvent();

  // Marker: a draft-creation flow was just initiated from THIS form session.
  // Lets the parent flow-model close the modal on `draftCreated` without
  // affecting unrelated draft flows triggered from elsewhere.
  //
  // Do NOT reset on `createDraftModel.draftCreated` — effector evaluates .on
  // before sample sources, so a parent reading this store would observe
  // `false`. Reset on flow boundaries instead.
  const $initiatedDraft = createStore(false)
    .on(saveAsDraftRequested, () => true)
    .reset(formInitiated, createDraftModel.modalClosed);

  // Reset the shared signing-path picker whenever draft mode flips OR the form
  // is re-initiated. Keeps the picker free of stale nodes when the user toggles
  // the mode mid-flow, or reopens the flow on a different network.
  sample({
    clock: [draftModeToggled, formInitiated, chainChanged],
    target: pathModel.pathReset,
  });

  // Stable committed draft signing path. Inline view and draft submission read
  // from here, not directly from `pathModel` — `SigningPathEditModal` resets
  // pathModel on close, which would wipe the inline view if it were the source
  // of truth.
  const draftPathCommitted = createEvent<PathNode[]>();
  const draftPathEditStarted = createEvent();
  const draftPathEditEnded = createEvent();

  const $isEditingDraftPath = createStore(false)
    .on(draftPathEditStarted, () => true)
    .on(draftPathEditEnded, () => false)
    .reset(formInitiated, draftModeToggled, chainChanged);

  const $draftSigningPath = createStore<PathNode[]>([])
    .on(draftPathCommitted, (_, path) => path)
    .reset(formInitiated, draftModeToggled, chainChanged);

  // Auto-commit when `StepPath` finishes the path and the user isn't mid-edit
  // inside the modal. The modal's own pathModel changes are gated by
  // `$isEditingDraftPath` so they don't double-commit.
  sample({
    clock: pathModel.$path,
    source: $isEditingDraftPath,
    filter: (isEditing, path) => !isEditing && path.length > 0 && path[path.length - 1]!.kind === 'signer',
    fn: (_, path) => path,
    target: draftPathCommitted,
  });

  // Clear the committed path when the user truncates back via the StepPath
  // breadcrumb. Listening to `pathTruncatedTo` (rather than every `$path`
  // emission) intentionally ignores resets emitted by SigningPathEditModal's
  // cleanup, CreateDraftModal's own modalClosed flow, and chain/init resets —
  // none of those are user truncations and clearing on them would lose the
  // committed draft path when the user just navigated away from a nested
  // modal. The `$isEditingDraftPath` gate additionally blocks truncates the
  // modal fires during seeding.
  sample({
    clock: pathModel.pathTruncatedTo,
    source: $isEditingDraftPath,
    filter: (isEditing) => !isEditing,
    fn: () => [] as PathNode[],
    target: $draftSigningPath,
  });

  const $isDraftPathComplete = $draftSigningPath.map(
    (path) => path.length > 0 && path[path.length - 1]!.kind === 'signer',
  );

  const connectSave = ({ source, $callDataHex, $networkStore, $canSave }: ConnectSaveOpts) => {
    sample({
      clock: saveAsDraftRequested,
      source: {
        callData: $callDataHex,
        network: $networkStore,
        path: $draftSigningPath,
        canSave: $canSave,
      },
      filter: ({ canSave, callData, network }) => canSave && !!callData && !!network,
      fn: ({ callData, network, path }) => ({
        callData: callData!,
        chainId: network!.chain.chainId,
        path,
        source,
        inputMode: 'paste' as const,
      }),
      target: createDraftModel.createDraftRequested,
    });
  };

  return {
    draftModeToggled,
    $isDraftMode,
    saveAsDraftRequested,
    $initiatedDraft,
    $draftSigningPath,
    $isDraftPathComplete,
    draftPathCommitted,
    draftPathEditStarted,
    draftPathEditEnded,
    connectSave,
  };
};
