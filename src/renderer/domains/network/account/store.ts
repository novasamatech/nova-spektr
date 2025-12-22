import { attach, createEffect, createStore, restore, sample } from 'effector';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { AccountNameType } from '@/shared/core';
import { merge, nonNullable } from '@/shared/lib/utils';

import { accountService } from './service';
import { type AnyAccount, type AnyAccountDraft } from './types';

const $accounts = createStore<AnyAccount[]>([]);

const $populated = restore(
  once($accounts.updates).map(() => true),
  false,
);

const populateFx = createEffect((): Promise<AnyAccount[]> => storageService.accounts2.readAll());

const createAccountsFx = createEffect(async (accounts: AnyAccountDraft[]): Promise<AnyAccount[]> => {
  if (accounts.length === 0) return [];

  const dbAccounts = await storageService.accounts2.createAll(
    accounts.map(a => ({
      ...a,
      id: accountService.uniqId(a),
      nameType: a.nameType ?? AccountNameType.GENERATED,
      createdAt: a.createdAt ?? Date.now(),
    })),
  );

  return dbAccounts ?? [];
});

const updateAccountsFx = createEffect(async (accounts: AnyAccountDraft[]): Promise<boolean> => {
  if (accounts.length === 0) return false;

  const drafts = accounts.map(a => ({ ...a, id: accountService.uniqId(a) }));

  return storageService.accounts2.updateAll(drafts).then(nonNullable);
});

const updateAccount = attach({
  source: $accounts,
  mapParams: (draft: AnyAccountDraft, accounts) => {
    const match = accounts.some(a => accountService.uniqId(a) === accountService.uniqId(draft));

    return match ? [draft] : [];
  },
  effect: updateAccountsFx,
});

const deleteAccountsFx = createEffect(async (accounts: AnyAccount[]) => {
  // TODO: set correct id
  await storageService.accounts2.deleteAll(accounts.map(accountService.uniqId));

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
      mergeBy: accountService.uniqId,
    }),
  target: $accounts,
});

sample({
  clock: updateAccount.done,
  source: $accounts,
  filter: (_, { result: successful }) => successful,
  fn: (accounts, { params: draft }) => {
    const draftId = accountService.uniqId(draft);

    return accounts.map(a => (accountService.uniqId(a) === draftId ? { ...a, ...draft } : a));
  },
  target: $accounts,
});

sample({
  clock: updateAccountsFx.done,
  source: $accounts,
  filter: (_, { result: successful }) => successful,
  fn: (accounts, { params: drafts }) => {
    const draftsMap = drafts.reduce<Record<string, AnyAccountDraft>>((acc, draft) => {
      acc[accountService.uniqId(draft)] = draft;

      return acc;
    }, {});

    return accounts.map<AnyAccount>(a =>
      accountService.uniqId(a) in draftsMap ? { ...a, ...draftsMap[accountService.uniqId(a)] } : a,
    );
  },
  target: $accounts,
});

sample({
  clock: deleteAccountsFx.done,
  source: $accounts,
  fn: (accounts, { result: deletedAccounts }) => {
    const deletedIds = deletedAccounts.map(accountService.uniqId);

    return accounts.filter(a => !deletedIds.includes(accountService.uniqId(a)));
  },
  target: $accounts,
});

export const accounts = {
  $list: readonly($accounts),
  $populated: readonly($populated),

  populate: populateFx,
  createAccounts: createAccountsFx,
  updateAccounts: updateAccountsFx,
  deleteAccounts: deleteAccountsFx,
  updateAccount,

  __test: {
    $list: $accounts,
    $populated,
  },
};
