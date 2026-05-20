import { type Event, type Store, createEvent, createStore, sample } from 'effector';

import { type ChainId } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { pathModel } from '@/features/signing-path';
import { createDraftModel } from '../model/create-draft-model';

type FactoryOpts = {
  formInitiated: Event<unknown>;
  chainChanged: Event<unknown>;
};

export type DraftNetworkStore = Store<{ chain: { chainId: ChainId } } | null>;

type ConnectSaveOpts = {
  source: string;
  $callDataHex: Store<string | null>;
  $networkStore: DraftNetworkStore;
  $canSave: Store<boolean>;
};

export const createDraftModeBinding = ({ formInitiated, chainChanged }: FactoryOpts) => {
  const draftModeToggled = createEvent<boolean | null>();
  const $isDraftMode = createStore(false)
    .on(draftModeToggled, (state, update) => (nonNullable(update) ? update : !state))
    .reset(formInitiated);

  const saveAsDraftRequested = createEvent();

  // Do NOT reset on `createDraftModel.draftCreated` — effector evaluates `.on`
  // before sample sources, so a parent reading this store on `draftCreated`
  // would observe `false`. Reset on flow boundaries instead.
  const $initiatedDraft = createStore(false)
    .on(saveAsDraftRequested, () => true)
    .reset(formInitiated, createDraftModel.modalClosed);

  sample({
    clock: [draftModeToggled, formInitiated, chainChanged],
    target: pathModel.pathReset,
  });

  // `$draftSigningPath` mirrors the committed path independently of `pathModel`
  // because `SigningPathEditModal` resets `pathModel` on close.
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

  sample({
    clock: pathModel.$path,
    source: $isEditingDraftPath,
    filter: (isEditing, path) => !isEditing && path.at(-1)?.kind === 'signer',
    fn: (_, path) => path,
    target: draftPathCommitted,
  });

  // Listening to `pathTruncatedTo` (not every `$path` emission) lets us treat
  // resets from SigningPathEditModal/CreateDraftModal/chain-init as non-clearing,
  // preserving the committed path when the user just navigated away from a modal.
  sample({
    clock: pathModel.pathTruncatedTo,
    source: $isEditingDraftPath,
    filter: (isEditing) => !isEditing,
    fn: () => [] as PathNode[],
    target: $draftSigningPath,
  });

  const $isDraftPathComplete = $draftSigningPath.map((path) => path.at(-1)?.kind === 'signer');

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
