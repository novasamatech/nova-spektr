import { type Effect, createEffect, createEvent, sample } from 'effector';
import { readonly, spread } from 'patronum';

import { type StorageService } from '@/shared/api/storage/service/storageService';
import { type NoID } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';

import { type Resource } from './deriveFromResources';

interface DexieParams<Data extends { id: any }> {
  storage: StorageService<Data, any>;
  onReceive?(data: NoID<Data>[], storage: Data[]): { create: Data[]; update: Data[] };
}

export interface DexieResource<Data extends { id: any }> extends Resource<NoID<Data>[], Data[]> {
  create: Effect<NoID<Data>[], Data[]>;
  read: Effect<void, Data[]>;
  update: Effect<Data[], Data[]>;
  delete: Effect<Data[], Data[]>;
}

export const createDexieResource = <Data extends { id: any }>({
  storage,
  onReceive,
}: DexieParams<Data>): DexieResource<Data> => {
  const receive = createEvent<NoID<Data>[]>();
  const push = createEvent<Data[]>();

  const createFx = createEffect<NoID<Data>[], Data[]>((drafts) => {
    return storage.createAll(drafts).then((r) => r ?? []);
  });

  const updateFx = createEffect<Data[], Data[]>((drafts) => {
    return storage.updateAll(drafts).then(() => drafts);
  });

  const readFx = createEffect<void, Data[]>(() => {
    return storage.readAll();
  });

  const deleteFx = createEffect<Data[], Data[]>((data) => {
    return storage.deleteAll(data.map((d) => d.id)).then(() => data);
  });

  const calculateUpdateFx = createEffect(async (received: NoID<Data>[]) => {
    if (nullable(onReceive)) return { create: received, update: [] };
    const all = await readFx();
    return onReceive(received, all);
  });

  sample({
    clock: receive,
    target: calculateUpdateFx,
  });

  sample({
    clock: calculateUpdateFx.doneData,
    target: spread({
      create: createFx,
      update: updateFx,
    }),
  });

  sample({
    clock: [createFx.doneData, readFx.doneData, updateFx.doneData],
    target: push,
  });

  return {
    receive,
    push: readonly(push),

    create: createFx,
    read: readFx,
    update: updateFx,
    delete: deleteFx,
  };
};
