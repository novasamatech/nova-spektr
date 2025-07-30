import { attach, combine, createEffect, createEvent, createStore, restore, sample } from 'effector';
import { not, or, readonly } from 'patronum';

import { storageService } from '@/shared/api/storage';
import {
  type ID,
  type MultisigAccount,
  type NoID,
  type PolkadotVaultGroup,
  type ProxiedAccount,
  type VaultBaseAccount,
  type Wallet,
  type WatchOnlyAccount,
  type WcAccount,
} from '@/shared/core';
import { dictionary, groupBy, nonNullable, nullable, toKeysRecord } from '@/shared/lib/utils';
// TODO wallet model should be either in wallets domain or wallets feature
// eslint-disable-next-line boundaries/element-types
import {
  type AnyAccount,
  type AnyAccountDraft,
  type ChainAccount,
  type UniversalAccount,
  accountService,
  accounts,
} from '@/domains/network';

type DbWallet = Omit<Wallet, 'accounts'>;

export type CreateParams<T extends AnyAccount = AnyAccount, W extends Wallet = Wallet> = {
  wallet: Omit<NoID<W>, 'isActive' | 'accounts'>;
  accounts: (T extends any ? Omit<NoID<T>, 'walletId'> : never)[];
};

const watchOnlyCreated = createEvent<CreateParams<WatchOnlyAccount>>();
const singleshardCreated = createEvent<CreateParams<VaultBaseAccount, PolkadotVaultGroup>>();
const multisigCreated = createEvent<CreateParams<MultisigAccount>>();
const flexibleMultisigCreated = createEvent<CreateParams<MultisigAccount>>();
const walletConnectCreated = createEvent<CreateParams<WcAccount>>();
const proxiedCreated = createEvent<CreateParams<ProxiedAccount>>();

const walletRestored = createEvent<Wallet>();
const walletRemoved = createEvent<ID>();
// TODO this is temp solution, each type of wallet should update own data inside feature
const updateWallet = createEvent<{ walletId: ID; data: NonNullable<unknown> }>();
const updateWalletWithDB = createEvent<Wallet>();

const $rawWallets = createStore<DbWallet[]>([]);

const $allWallets = combine($rawWallets, accounts.$list, (wallets, accounts) => {
  const grouped = groupBy(accounts, (a) => a.walletId);

  return wallets.map((wallet) => ({ ...wallet, accounts: grouped[wallet.id] ?? [] })) as Wallet[];
});
const $wallets = $allWallets.map((wallets) => wallets.filter((x) => !x.isHidden));
const $hiddenWallets = $allWallets.map((wallets) => wallets.filter((x) => x.isHidden));

// TODO: ideally it should be a feature
const $activeWallet = combine($wallets, (wallets) => {
  return wallets.find((wallet) => wallet.isActive) ?? null;
});

// TODO: ideally it should be a feature
const $activeAccounts = combine($activeWallet, accounts.$list, (wallet, accounts) => {
  if (nullable(wallet)) return [];

  return accountService.filterAccountsByWallet(accounts, wallet.id);
});

// Workaround - select event recreates wallet array every time, serialized ids are more stable.
const $walletIdsSerialized = $wallets.map((wallets) =>
  wallets
    .map((w) => w.id)
    .sort()
    .join(','),
);

// list of accounts filtered by non-hidden wallets
const $availableAccounts = combine($walletIdsSerialized, accounts.$list, (wallets, accounts) => {
  const ids = toKeysRecord(wallets.split(','));

  return accounts.filter((a) => a.walletId in ids);
});

const $populated = restore(
  $rawWallets.updates.map(() => true),
  false,
);

const fetchAllWalletsFx = createEffect(async (): Promise<DbWallet[]> => {
  const wallets = await storageService.wallets.readAll();

  // Deactivate wallets except first one if more than one selected
  const activeWallets = wallets.filter((wallet) => wallet.isActive);

  if (activeWallets.length > 1) {
    const inactiveWallets = activeWallets.slice(1).map((wallet) => ({ ...wallet, isActive: false }));
    await storageService.wallets.updateAll(inactiveWallets);

    const walletsMap = dictionary(wallets, 'id');

    for (const wallet of inactiveWallets) {
      walletsMap[wallet.id] = wallet;
    }

    return Object.values(walletsMap);
  }

  return wallets;
});

type CreateResult = {
  wallet: DbWallet;
  accounts: AnyAccount[];
};
const createWalletFx = createEffect(
  async ({ wallet, accounts: accountDrafts }: CreateParams): Promise<CreateResult | undefined> => {
    const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

    if (!dbWallet) return undefined;

    const accountsPayload = accountDrafts.map(
      (account) => ({ ...account, walletId: dbWallet.id }) as ChainAccount | UniversalAccount,
    );

    const dbAccounts = await accounts.createAccounts(accountsPayload);

    return { wallet: dbWallet, accounts: dbAccounts };
  },
);

const createWalletsFx = createEffect(
  async (
    drafts: {
      wallet: Omit<NoID<Wallet>, 'isActive' | 'accounts'>;
      accounts: Omit<AnyAccountDraft, 'walletId'>[];
    }[],
  ): Promise<CreateResult[]> => {
    const requests = drafts.map(async ({ wallet, accounts: accountDrafts }) => {
      const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

      if (!dbWallet) return undefined;

      const accountsPayload = accountDrafts.map(
        (account) => ({ ...account, walletId: dbWallet.id }) as ChainAccount | UniversalAccount,
      );

      const dbAccounts = await accounts.createAccounts(accountsPayload);

      return { wallet: dbWallet, accounts: dbAccounts };
    });

    return Promise.all(requests).then((r) => r.filter(nonNullable));
  },
);

const removeWalletFx = createEffect(async (wallet: Wallet): Promise<ID> => {
  await storageService.wallets.delete(wallet.id);
  await accounts.deleteAccounts(wallet.accounts);

  return wallet.id;
});

const updateWalletFx = createEffect(async (wallet: Wallet): Promise<Wallet> => {
  const { accounts: _, ...rest } = wallet;
  await storageService.wallets.update(rest.id, rest);

  return wallet;
});

const restoreWalletFx = createEffect(async (wallet: Wallet): Promise<Wallet> => {
  await storageService.wallets.update(wallet.id, { isHidden: false });

  return wallet;
});

sample({
  clock: fetchAllWalletsFx.doneData,
  target: $rawWallets,
});

const walletCreatedDone = sample({ clock: createWalletFx.doneData }).filter({ fn: nonNullable });

const walletCreationFail = sample({ clock: createWalletFx.fail }).filter({ fn: nonNullable });

sample({
  clock: [
    walletConnectCreated,
    watchOnlyCreated,
    multisigCreated,
    flexibleMultisigCreated,
    singleshardCreated,
    proxiedCreated.filter({ fn: nonNullable }),
  ],
  target: createWalletFx,
});

sample({
  clock: walletCreatedDone,
  source: $rawWallets,
  fn: (wallets, data) => {
    return wallets.concat(data.wallet);
  },
  target: $rawWallets,
});

sample({
  clock: createWalletsFx.doneData,
  source: $rawWallets,
  fn: (wallets, results) => {
    return wallets.concat(results.map((r) => r.wallet));
  },
  target: $rawWallets,
});

// Remove wallet

sample({
  clock: walletRemoved,
  source: $allWallets,
  filter: (wallets, walletId) => {
    return wallets.some((wallet) => wallet.id === walletId);
  },
  fn: (wallets, walletId) => {
    return wallets.find((wallet) => wallet.id === walletId)!;
  },
  target: removeWalletFx,
});

const removeWalletsFx = createEffect(async (wallets: Wallet[]): Promise<ID[]> => {
  const walletIds: ID[] = [];
  const accountsToRemove: AnyAccount[] = [];

  for (const wallet of wallets) {
    walletIds.push(wallet.id);
    accountsToRemove.push(...wallet.accounts);
  }

  await Promise.all([storageService.wallets.deleteAll(walletIds), accounts.deleteAccounts(accountsToRemove)]);

  return walletIds;
});

const walletsRemovedFx = attach({
  source: $allWallets,
  effect: (wallets, walletIds: ID[]) => {
    const filteredWallets = wallets.filter((wallet) => walletIds.includes(wallet.id));
    if (filteredWallets.length === 0) return;

    return removeWalletsFx(filteredWallets);
  },
});

sample({
  clock: removeWalletFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletId) => {
    return wallets.filter((wallet) => wallet.id !== walletId);
  },
  target: $rawWallets,
});

sample({
  clock: removeWalletsFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletIds) => {
    return wallets.filter((wallet) => !walletIds.includes(wallet.id));
  },
  target: $rawWallets,
});

// Hide wallet

const hideWalletFx = createEffect(async (walletId: ID): Promise<ID> => {
  await storageService.wallets.update(walletId, { isHidden: true });

  return walletId;
});

const walletHiddenFx = attach({
  source: $allWallets,
  effect: (wallets, walletId: ID) => {
    if (!wallets.some((wallet) => wallet.id === walletId)) return;

    return hideWalletFx(walletId);
  },
});

sample({
  clock: hideWalletFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletIdToHide) => {
    return wallets.map((wallet) => {
      return wallet.id === walletIdToHide ? { ...wallet, isHidden: true } : wallet;
    });
  },
  target: $rawWallets,
});

sample({
  clock: walletRestored,
  source: $hiddenWallets,
  filter: (hiddenWallets, walletToRestore) => {
    return hiddenWallets.some((wallet) => wallet.id === walletToRestore.id);
  },
  fn: (_, walletToRestore) => walletToRestore,
  target: restoreWalletFx,
});

sample({
  clock: restoreWalletFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletToRestore) => {
    return wallets.map((wallet) => {
      return wallet.id === walletToRestore.id ? { ...wallet, isHidden: false } : wallet;
    });
  },
  target: $rawWallets,
});

sample({
  clock: updateWallet,
  source: $rawWallets,
  fn: (wallets, { walletId, data }) => {
    return wallets.map((wallet) => {
      return wallet.id === walletId ? { ...wallet, ...data } : wallet;
    });
  },
  target: $rawWallets,
});

sample({
  clock: updateWalletWithDB,
  target: updateWalletFx,
});

sample({
  clock: updateWalletFx.doneData,
  fn: (wallet) => ({ walletId: wallet.id, data: wallet }),
  target: updateWallet,
});

export const walletModel = {
  $wallets,
  $allWallets: readonly($allWallets),
  $hiddenWallets,
  /**
   * @deprecated Use `import { walletSelect } from '@/aggregates/wallet-select'`
   */
  $activeWallet,
  /**
   * @deprecated Use `import { walletSelect } from '@/aggregates/wallet-select'`
   */
  $activeAccounts,
  $availableAccounts,
  $isLoadingWallets: or(not($populated), fetchAllWalletsFx.pending),

  createWallet: createWalletFx,
  createWallets: createWalletsFx,
  updateWallet: updateWalletFx,
  populate: fetchAllWalletsFx,
  walletHidden: walletHiddenFx,
  walletsRemoved: walletsRemovedFx,

  events: {
    watchOnlyCreated,
    singleshardCreated,
    multisigCreated,
    flexibleMultisigCreated,
    walletConnectCreated,
    proxiedCreated,
    walletCreatedDone,
    walletCreationFail,
    updateWallet,
    updateWalletWithDB,
    walletRemoved,
    walletRemovedSuccess: removeWalletFx.done,
    walletRestored,
    walletRestoredSuccess: restoreWalletFx.done,
  },

  __test: {
    $rawWallets,
    walletCreatedFx: createWalletFx,
    removeWalletsFx,
  },
};
