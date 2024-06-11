import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { combineEvents } from 'patronum';
import groupBy from 'lodash/groupBy';

import type { ID, MultisigAccount, NoID, Wallet, Account, BaseAccount, ChainAccount, WcAccount } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { dictionary } from '@shared/lib/utils';
import { modelUtils } from '../lib/model-utils';

type DbWallet = Omit<Wallet, 'accounts'>;

type CreateParams<T extends Account = Account> = {
  wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
  accounts: Omit<NoID<T>, 'walletId'>[];
};

const walletStarted = createEvent();
const watchOnlyCreated = createEvent<CreateParams<BaseAccount>>();
const multishardCreated = createEvent<CreateParams<BaseAccount | ChainAccount>>();
const singleshardCreated = createEvent<CreateParams<BaseAccount>>();
const multisigCreated = createEvent<CreateParams<MultisigAccount>>();
const walletConnectCreated = createEvent<CreateParams<WcAccount>>();

type MultisigUpdateParams = Partial<MultisigAccount> & { id: Account['id'] };
const multisigAccountUpdated = createEvent<MultisigUpdateParams>();

const walletRemoved = createEvent<ID>();
const walletsRemoved = createEvent<ID[]>();

const $wallets = createStore<Wallet[]>([]);

// TODO: ideally it should be a feature
const $activeWallet = combine(
  $wallets,
  (wallets) => {
    return wallets.find((wallet) => wallet.isActive);
  },
  { skipVoid: false },
);

const fetchAllAccountsFx = createEffect((): Promise<Account[]> => {
  return storageService.accounts.readAll();
});

const fetchAllWalletsFx = createEffect(async (): Promise<DbWallet[]> => {
  const wallets = await storageService.wallets.readAll();

  // Deactivate wallets except first one if more than one selected
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  if (activeWallets.length > 1) {
    const inactiveWallets = activeWallets.slice(1).map((wallet) => ({ ...wallet, isActive: false }));
    await storageService.wallets.updateAll(inactiveWallets);

    const walletsMap = dictionary(wallets, 'id');

    inactiveWallets.forEach((wallet) => {
      walletsMap[wallet.id] = wallet;
    });

    return Object.values(walletsMap);
  }

  return wallets;
});

type CreateResult = {
  wallet: DbWallet;
  accounts: Account[];
};
const walletCreatedFx = createEffect(async ({ wallet, accounts }: CreateParams): Promise<CreateResult | undefined> => {
  const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

  if (!dbWallet) return undefined;

  const accountsPayload = accounts.map((account) => ({ ...account, walletId: dbWallet.id }));
  const dbAccounts = await storageService.accounts.createAll(accountsPayload);

  if (!dbAccounts) return undefined;

  return { wallet: dbWallet, accounts: dbAccounts };
});

const multishardCreatedFx = createEffect(
  async ({ wallet, accounts }: CreateParams<BaseAccount | ChainAccount>): Promise<CreateResult | undefined> => {
    const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

    if (!dbWallet) return undefined;

    const { base, chains } = modelUtils.groupAccounts(accounts);

    const multishardAccounts = [];

    for (const [index, baseAccount] of base.entries()) {
      const dbBaseAccount = await storageService.accounts.create({ ...baseAccount, walletId: dbWallet.id });
      if (!dbBaseAccount) return undefined;

      multishardAccounts.push(dbBaseAccount);
      if (!chains[index]) continue;

      const accountsPayload = chains[index].map((account) => ({
        ...account,
        walletId: dbWallet.id,
        baseId: dbBaseAccount.id,
      }));
      const dbChainAccounts = await storageService.accounts.createAll(accountsPayload);
      if (!dbChainAccounts) return undefined;

      multishardAccounts.push(...dbChainAccounts);
    }

    return { wallet: dbWallet, accounts: multishardAccounts };
  },
);

const removeWalletFx = createEffect(async (wallet: Wallet): Promise<ID> => {
  const accountIds = wallet.accounts.map((account) => account.id);

  await Promise.all([storageService.accounts.deleteAll(accountIds), storageService.wallets.delete(wallet.id)]);

  return wallet.id;
});

const removeWalletsFx = createEffect(async (wallets: Wallet[]): Promise<ID[]> => {
  const { walletIds, accountIds } = wallets.reduce<Record<'walletIds' | 'accountIds', ID[]>>(
    (acc, wallet) => {
      acc.walletIds.push(wallet.id);
      acc.accountIds.push(...wallet.accounts.map((account) => account.id));

      return acc;
    },
    { walletIds: [], accountIds: [] },
  );

  await Promise.all([storageService.accounts.deleteAll(accountIds), storageService.wallets.deleteAll(walletIds)]);

  return walletIds;
});

const multisigWalletUpdatedFx = createEffect(
  async (account: MultisigUpdateParams): Promise<MultisigUpdateParams | undefined> => {
    const id = await storageService.accounts.update(account.id, account);

    return id ? account : undefined;
  },
);

sample({
  clock: walletStarted,
  target: [fetchAllAccountsFx, fetchAllWalletsFx],
});

sample({
  clock: combineEvents([fetchAllAccountsFx.doneData, fetchAllWalletsFx.doneData]),
  fn: ([accounts, wallets]) => {
    const accountsMap = groupBy(accounts, 'walletId');

    return wallets.map((wallet) => ({ ...wallet, accounts: accountsMap[wallet.id] } as Wallet));
  },
  target: $wallets,
});

sample({
  clock: [walletConnectCreated, watchOnlyCreated, multisigCreated, singleshardCreated],
  target: walletCreatedFx,
});

sample({
  clock: multishardCreated,
  target: multishardCreatedFx,
});

sample({
  clock: [walletCreatedFx.doneData, multishardCreatedFx.doneData],
  source: $wallets,
  filter: (_, data) => Boolean(data),
  fn: (wallets, data) => {
    return wallets.concat({ ...data!.wallet, accounts: data!.accounts });
  },
  target: $wallets,
});

sample({
  clock: walletRemoved,
  source: $wallets,
  filter: (wallets, walletId) => {
    return wallets.some((wallet) => wallet.id === walletId);
  },
  fn: (wallets, walletId) => {
    return wallets.find((wallet) => wallet.id === walletId)!;
  },
  target: removeWalletFx,
});

sample({
  clock: walletsRemoved,
  source: $wallets,
  filter: (wallets, walletIds) => {
    return wallets.some((wallet) => walletIds.includes(wallet.id));
  },
  fn: (wallets, walletIds) => {
    return wallets.filter((wallet) => walletIds.includes(wallet.id));
  },
  target: removeWalletsFx,
});

sample({
  clock: removeWalletFx.doneData,
  source: $wallets,
  fn: (wallets, walletId) => {
    return wallets.filter((wallet) => wallet.id !== walletId);
  },
  target: $wallets,
});

sample({
  clock: removeWalletsFx.doneData,
  source: $wallets,
  fn: (wallets, walletIds) => {
    return wallets.filter((wallet) => !walletIds.includes(wallet.id));
  },
  target: $wallets,
});

sample({
  clock: multisigAccountUpdated,
  target: multisigWalletUpdatedFx,
});

// TODO: update wallet
sample({
  clock: multisigWalletUpdatedFx.doneData,
  source: $wallets,
  filter: (_, data) => Boolean(data),
  fn: (wallets, data) => {
    return wallets.map((wallet) => {
      if (data!.walletId !== wallet.id) return wallet;

      const newAccounts = wallet.accounts.map((account) => {
        return account.id === data!.id ? data : account;
      });

      return { ...wallet, accounts: newAccounts } as Wallet;
    });
  },
  target: $wallets,
});

export const walletModel = {
  $wallets,
  $activeWallet,
  $isLoadingWallets: fetchAllWalletsFx.pending,

  events: {
    walletStarted,
    watchOnlyCreated,
    multishardCreated,
    singleshardCreated,
    multisigCreated,
    walletConnectCreated,
    multisigAccountUpdated,
    walletRemoved,
    walletRemovedSuccess: removeWalletFx.done,
    walletsRemoved,
  },
};
