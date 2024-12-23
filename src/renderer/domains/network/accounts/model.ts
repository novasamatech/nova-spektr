import { attach, createEffect, createStore, restore, sample } from 'effector';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { merge, nonNullable, nullable } from '@/shared/lib/utils';

import { accountsService } from './service';
import { type AnyAccount, type AnyAccountDraft } from './types';

const $accounts = createStore<AnyAccount[]>([]);

const $populated = restore(
  once($accounts.updates).map(() => true),
  false,
);

const populateFx = createEffect((): Promise<AnyAccount[]> => storageService.accounts2.readAll());

const createAccountsFx = createEffect(async (accounts: AnyAccount[]): Promise<AnyAccount[]> => {
  return storageService.accounts2
    .createAll(accounts.map(a => ({ ...a, id: accountsService.uniqId(a) })))
    .then(x => x ?? []);
});

const updateAccountFx = createEffect(async (account: AnyAccountDraft | null): Promise<boolean> => {
  if (nullable(account)) return false;

  const id = accountsService.uniqId(account);

  return storageService.accounts2.update(id, account).then(nonNullable);
});

const updateAccount = attach({
  source: $accounts,
  mapParams: (draft: AnyAccountDraft, accounts) => {
    if (accounts.find(a => accountsService.uniqId(a) === accountsService.uniqId(draft))) {
      return draft;
    }

    return null;
  },
  effect: updateAccountFx,
});

const deleteAccountsFx = createEffect(async (accounts: AnyAccount[]) => {
  // TODO set correct id
  await storageService.accounts2.deleteAll(accounts.map(accountsService.uniqId));

  return accounts;
});

sample({
  clock: populateFx.doneData,
  target: $accounts,
});

sample({
  clock: createAccountsFx.doneData,
  source: $accounts,
  fn: (accounts, newAccounts) =>
    merge({
      a: accounts,
      b: newAccounts,
      mergeBy: accountsService.uniqId,
    }),
  target: $accounts,
});

sample({
  clock: updateAccount.done,
  source: $accounts,
  filter: (_, { result: successful }) => successful,
  fn: (accounts, { params: draft }) => {
    const draftId = accountsService.uniqId(draft);

    return accounts.map(a =>
      accountsService.uniqId(a) === draftId ? ({ ...a, ...draft } as AnyAccount) : a,
    ) as AnyAccount[];
  },
  target: $accounts,
});

sample({
  clock: deleteAccountsFx.done,
  source: $accounts,
  fn: (accounts, { result: deletedAccounts }) => {
    const deletedIds = deletedAccounts.map(accountsService.uniqId);

    return accounts.filter(a => !deletedIds.includes(accountsService.uniqId(a)));
  },
  target: $accounts,
});

export const accountsDomainModel = {
  $list: readonly($accounts),
  $populated: readonly($populated),

  populate: populateFx,
  createAccounts: createAccountsFx,
  updateAccount,
  deleteAccounts: deleteAccountsFx,

  __test: {
    $list: $accounts,
    updateAccountFx,
  },
};
