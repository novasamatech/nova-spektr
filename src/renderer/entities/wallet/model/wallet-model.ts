import { createStore, createEvent, forward, createEffect, sample } from 'effector';

import type { Wallet, ID, NoID, Account } from '@renderer/shared/core';
import { kernelModel } from '@renderer/shared/core';
import { storageService } from '@renderer/shared/api/storage';

type NoIdWallet = NoID<Wallet>;

const $wallets = createStore<Wallet[]>([]);
const $activeWallet = createStore<Wallet | null>(null);

type CreationParams = { wallet: NoIdWallet; accounts: NoID<Account>[] };
const walletCreated = createEvent<CreationParams>();
const walletSelected = createEvent<ID>();

const fetchAllWalletsFx = createEffect((): Promise<Wallet[]> => {
  return storageService.wallets.readBulk();
});

const walletCreatedFx = createEffect(async (data: Omit<NoIdWallet, 'isActive'>): Promise<Wallet | undefined> => {
  const payload = { ...data, isActive: true };
  const id = await storageService.wallets.create(payload);

  return id ? { id, ...payload } : undefined;
});

type SelectParams = {
  prevId?: ID;
  nextId: ID;
};
const walletSelectedFx = createEffect(async ({ prevId, nextId }: SelectParams): Promise<ID | undefined> => {
  if (!prevId) {
    return storageService.wallets.update(nextId, { isActive: true });
  }

  // TODO: consider using Dexie transaction() | Task --> https://app.clickup.com/t/8692uyemn
  const [prevIdDB, nextIdDB] = await Promise.all([
    storageService.wallets.update(prevId, { isActive: false }),
    storageService.wallets.update(nextId, { isActive: true }),
  ]);

  return prevIdDB && nextIdDB ? nextIdDB : undefined;
});

forward({ from: kernelModel.events.appStarted, to: fetchAllWalletsFx });
forward({ from: fetchAllWalletsFx.doneData, to: $wallets });

sample({
  clock: fetchAllWalletsFx.doneData,
  filter: (wallets) => wallets.length > 0,
  fn: (wallets) => {
    const match = wallets.find((wallet) => wallet.isActive) || wallets[0];

    return { nextId: match.id };
  },
  target: walletSelectedFx,
});

sample({
  clock: walletSelected,
  source: $activeWallet,
  fn: (wallet, nextId) => ({ prevId: wallet?.id, nextId }),
  target: walletSelectedFx,
});

sample({
  clock: walletSelectedFx.doneData,
  source: $wallets,
  filter: (wallets, nextId) => {
    return wallets !== null && wallets.length > 0 && Boolean(nextId);
  },
  fn: (wallets, nextId) => {
    return wallets!.find((wallet) => wallet.id === nextId) || wallets![0];
  },
  target: $activeWallet,
});

forward({ from: walletCreated, to: walletCreatedFx });

sample({
  clock: walletCreatedFx.doneData,
  source: $wallets,
  filter: (_, newWallet) => Boolean(newWallet),
  fn: (wallets, newWallet) => (wallets || []).concat(newWallet!),
  target: $wallets,
});

sample({
  clock: walletCreatedFx.doneData,
  filter: (newWallet) => Boolean(newWallet),
  fn: (newWallet) => newWallet!.id,
  target: walletSelected,
});

export const walletModel = {
  $wallets,
  $activeWallet,
  events: {
    walletCreated,
    walletSelected,
  },
  // TODO: remove when effector will have been integrated in client components / models
  effects: {
    walletCreatedFx,
    walletSelectedFx,
  },
};
