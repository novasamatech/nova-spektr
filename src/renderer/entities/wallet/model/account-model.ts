import { createStore, forward, createEffect, createEvent } from 'effector';

import type { Account, NoID, ID } from '@renderer/shared/core';
import { kernelModel } from '@renderer/shared/core';
import { storageService } from '@renderer/shared/api/storage';

type NoIdAccount = NoID<Account>;

const $accounts = createStore<Account[]>([]);
const $activeAccounts = createStore<Account[]>([]);

const accountsCreated = createEvent<NoIdAccount[]>();

const fetchAllAccountsFx = createEffect((): Promise<Account[]> => {
  return storageService.accounts.readBulk();
});

const accountsCreatedFx = createEffect((data: NoIdAccount[]): Promise<ID[] | undefined> => {
  return storageService.accounts.createBulk(data);
});

forward({ from: kernelModel.events.appStarted, to: fetchAllAccountsFx });
forward({ from: fetchAllAccountsFx.doneData, to: $accounts });

forward({ from: accountsCreated, to: accountsCreatedFx });

export const accountModel = {
  $accounts,
  $activeAccounts,
  events: {
    accountsCreated,
  },
  // TODO: remove when effector will have been integrated in client components / models
  effects: {
    accountsCreatedFx,
  },
};
