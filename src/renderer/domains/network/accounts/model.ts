import { attach, createEffect, createStore, restore, sample } from 'effector';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { merge, nonNullable } from '@/shared/lib/utils';

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

const updateAccountsFx = createEffect(async (accounts: AnyAccountDraft[]): Promise<boolean> => {
  if (accounts.length === 0) return false;

  const drafts = accounts.map(a => {
    const id = accountsService.uniqId(a);

    return { ...a, id };
  });

  return storageService.accounts2.updateAll(drafts).then(nonNullable);
});

const updateAccount = attach({
  source: $accounts,
  mapParams: (draft: AnyAccountDraft, accounts) => {
    if (accounts.find(a => accountsService.uniqId(a) === accountsService.uniqId(draft))) {
      return [draft];
    }

    return [];
  },
  effect: updateAccountsFx,
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
    console.log({ accounts, draft });
    const draftId = accountsService.uniqId(draft);

    return accounts.map(a => (accountsService.uniqId(a) === draftId ? { ...a, ...draft } : a));
  },
  target: $accounts,
});

sample({
  clock: updateAccountsFx.done,
  source: $accounts,
  filter: (_, { result: successful }) => successful,
  fn: (accounts, { params: drafts }) => {
    const draftsMap = drafts.reduce<Record<string, AnyAccountDraft>>((acc, draft) => {
      acc[accountsService.uniqId(draft)] = draft;

      return acc;
    }, {});

    return accounts.map(a =>
      accountsService.uniqId(a) in draftsMap ? { ...a, ...draftsMap[accountsService.uniqId(a)] } : a,
    );
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
  updateAccounts: updateAccountsFx,
  deleteAccounts: deleteAccountsFx,

  __test: {
    $list: $accounts,
  },
};
