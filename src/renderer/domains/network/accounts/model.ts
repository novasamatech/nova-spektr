import { attach, createEffect, createStore, restore, sample } from 'effector';
import { once, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import { merge, nonNullable, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { accountsService } from './service';
import { type AnyAccount, type AnyAccountDraft } from './types';

const accountDBKey = (x: Pick<AnyAccount, 'accountId' | 'walletId'>): [AccountId, WalletId: number] => {
  return [x.accountId, x.walletId];
};

const $accounts = createStore<AnyAccount[]>([]);

const $populated = restore(
  once($accounts.updates).map(() => true),
  false,
);

const populateFx = createEffect((): Promise<AnyAccount[]> => storageService.accounts2.readAll());

const createAccountsFx = createEffect(async (accounts: AnyAccount[]): Promise<AnyAccount[]> => {
  return storageService.accounts2.createAll(accounts).then(x => x ?? []);
});

const updateAccountFx = createEffect(async (account: AnyAccountDraft | null): Promise<boolean> => {
  if (nullable(account)) return false;

  return storageService.accounts2.update(accountDBKey(account), account).then(nonNullable);
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
  await storageService.accounts2.deleteAll(accounts.map(accountDBKey));

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
      mergeBy: accountDBKey,
    }),
  target: $accounts,
});

sample({
  clock: updateAccount.done,
  source: $accounts,
  filter: (_, { result: successful }) => successful,
  fn: (accounts, { params: draft }) => {
    const draftId = accountsService.uniqId(draft);

    return accounts.map(a => (accountsService.uniqId(a) === draftId ? { ...a, ...draft } : a));
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
