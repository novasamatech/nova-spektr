import { createEffect, createEvent, createStore, forward } from 'effector';

import storage, { MetadataDS } from '@renderer/shared/api/storage';
import { splice } from '@renderer/shared/lib/utils';
import type { Metadata } from './types';
import { ChainId } from '@renderer/domain/shared-kernel';

const metadataStorage = storage.connectTo('metadata');

if (!metadataStorage) {
  throw new Error('=== 🔴 Metadata storage in not defined 🔴 ===');
}

export const $metadata = createStore<MetadataDS[]>([]);
const appStarted = createEvent();

const populateMetadataFx = createEffect(() => {
  return metadataStorage.getAllMetadata();
});

const addMetadataFx = createEffect(async (metadata: Metadata) => {
  await metadataStorage.addMetadata(metadata);

  return metadata;
});

const updateMetadataFx = createEffect(async (metadata: Metadata) => {
  await metadataStorage.updateMetadata(metadata);

  return metadata;
});

const deleteMetadataFx = createEffect(({ chainId, metadataVersion }: { chainId: ChainId; metadataVersion: number }) => {
  metadataStorage.deleteMetadata(chainId, metadataVersion);

  return { chainId, metadataVersion };
});

$metadata
  .on(populateMetadataFx.doneData, (_, metadata) => {
    return metadata;
  })
  .on(addMetadataFx.doneData, (state, metadata) => {
    return state.concat(metadata);
  })
  .on(deleteMetadataFx.doneData, (state, { chainId, metadataVersion }) => {
    return state.filter((m) => m.chainId === chainId && m.metadataVersion === metadataVersion);
  })
  .on(updateMetadataFx.doneData, (state, metadata) => {
    const position = state.findIndex(
      (m) => m.chainId === metadata.chainId && m.metadataVersion === metadata.metadataVersion,
    );

    return splice(state, metadata, position);
  });

forward({
  from: appStarted,
  to: populateMetadataFx,
});

export const events = {
  appStarted,
};

export const effects = {
  addMetadataFx,
  deleteMetadataFx,
  updateMetadataFx,
};
