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
  AccountNameType,
} from '@/shared/core';
import { groupBy, nonNullable, toKeysRecord } from '@/shared/lib/utils';
import { accounts } from '@/domains/network';
import { type AnyAccount, type AnyAccountDraft } from '@/domains/network';

// TODO wallet model should be either in wallets domain or wallets feature

type DbWallet = Omit<Wallet, 'accounts'>;

export type WalletCreateParams<T extends AnyAccount = AnyAccount, W extends Wallet = Wallet> = {
  wallet: Omit<NoID<W>, 'accounts'>;
  accounts: Omit<NoID<T>, 'walletId'>[];
};

// Events - renamed to start with verbs
const createWatchOnly = createEvent<WalletCreateParams<WatchOnlyAccount>>();
const createSingleshard = createEvent<WalletCreateParams<VaultBaseAccount, PolkadotVaultGroup>>();
const createMultisig = createEvent<WalletCreateParams<MultisigAccount>>();
const createFlexibleMultisig = createEvent<WalletCreateParams<MultisigAccount>>();
const createWalletConnect = createEvent<WalletCreateParams<WcAccount>>();
const createProxied = createEvent<WalletCreateParams<ProxiedAccount>>();

const removeWallet = createEvent<ID>();
// TODO this is temp solution, each type of wallet should update own data inside feature
const updateWallet = createEvent<{ walletId: ID; data: NonNullable<unknown> }>();
const updateWalletWithDB = createEvent<Wallet>();

const $rawWallets = createStore<DbWallet[]>([]);

const $allWallets = combine($rawWallets, accounts.$list, (wallets, accounts) => {
  const grouped = groupBy(accounts, (a) => a.walletId);

  return wallets.map<Wallet>((wallet) => ({ ...wallet, accounts: grouped[wallet.id] ?? [] }));
});
const $wallets = $allWallets.map((wallets) => wallets.filter((x) => !x.isHidden));
const $hiddenWallets = $allWallets.map((wallets) => wallets.filter((x) => x.isHidden));

// list of accounts filtered by non-hidden wallets
const $availableAccounts = combine($wallets, accounts.$list, (wallets, allAccounts) => {
  const ids = toKeysRecord(wallets.map((w) => w.id));
  return allAccounts.filter((a) => a.walletId in ids);
});

const $populated = restore(
  $rawWallets.updates.map(() => true),
  false,
);

const fetchAllWalletsFx = createEffect(() => storageService.wallets.readAll());

type CreateResult = {
  wallet: Wallet;
  accounts: AnyAccount[];
};
const createWalletFx = createEffect(
  async ({ wallet, accounts: accountDrafts }: WalletCreateParams): Promise<CreateResult | undefined> => {
    const dbWallet = await storageService.wallets.create(wallet);

    if (!dbWallet) return undefined;

    const accountsPayload = accountDrafts.reduce<AnyAccountDraft[]>((acc, account) => {
      acc.push({
        ...account,
        walletId: dbWallet.id,
        nameType: account.nameType ?? AccountNameType.CUSTOM,
      } as AnyAccountDraft);

      return acc;
    }, []);

    const dbAccounts = await accounts.createAccounts(accountsPayload);

    return { wallet: { ...dbWallet, accounts: [] }, accounts: dbAccounts };
  },
);

const createWalletsFx = createEffect(async (drafts: WalletCreateParams[]): Promise<CreateResult[]> => {
  const createdWallets = await storageService.wallets.createAll(drafts.map((d) => d.wallet));
  if (!createdWallets) return [];

  const accountsToCreate: AnyAccountDraft[] = [];

  for (const [index, wallet] of createdWallets.entries()) {
    const accounts = drafts.at(index)?.accounts;
    if (!accounts) continue;

    for (const account of accounts) {
      accountsToCreate.push({
        ...account,
        walletId: wallet.id,
        nameType: account.nameType ?? AccountNameType.GENERATED,
      } as AnyAccountDraft);
    }
  }

  const dbAccounts = await accounts.createAccounts(accountsToCreate);

  const results: CreateResult[] = [];

  for (const wallet of createdWallets) {
    const accounts = dbAccounts.filter((a) => a.walletId === wallet.id);

    results.push({ wallet: { ...wallet, accounts: [] }, accounts });
  }

  return results;
});

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

const updateWalletsFx = createEffect(async (wallets: Wallet[]): Promise<Wallet[]> => {
  await storageService.wallets.updateAll(wallets.map(({ accounts: _, ...rest }) => rest));

  return wallets;
});

const restoreWalletsFx = attach({
  effect: updateWalletsFx,
  mapParams: (wallets: Wallet[]) => wallets.map((wallet) => ({ ...wallet, isHidden: false })),
});

const hideWalletsFx = attach({
  effect: updateWalletsFx,
  mapParams: (wallets: Wallet[]) => wallets.map((wallet) => ({ ...wallet, isHidden: true })),
});

sample({
  clock: fetchAllWalletsFx.doneData,
  target: $rawWallets,
});

const walletCreatedDone = sample({ clock: createWalletFx.doneData }).filter({ fn: nonNullable });

const walletCreationFail = sample({ clock: createWalletFx.fail }).filter({ fn: nonNullable });

sample({
  clock: [
    createWalletConnect,
    createWatchOnly,
    createMultisig,
    createFlexibleMultisig,
    createSingleshard,
    createProxied.filter({ fn: nonNullable }),
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
  clock: removeWallet,
  source: $allWallets,
  filter: (wallets, walletId) => wallets.some((w) => w.id === walletId),
  fn: (wallets, walletId) => wallets.find((w) => w.id === walletId)!,
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
    const filteredWallets = wallets.filter((w) => walletIds.includes(w.id));
    if (filteredWallets.length === 0) return;
    return removeWalletsFx(filteredWallets);
  },
});

sample({
  clock: removeWalletFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletId) => wallets.filter((w) => w.id !== walletId),
  target: $rawWallets,
});

sample({
  clock: removeWalletsFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletIds) => wallets.filter((w) => !walletIds.includes(w.id)),
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
    if (!wallets.some((w) => w.id === walletId)) return;
    return hideWalletFx(walletId);
  },
});

sample({
  clock: hideWalletFx.doneData,
  source: $rawWallets,
  fn: (wallets, walletIdToHide) => wallets.map((w) => (w.id === walletIdToHide ? { ...w, isHidden: true } : w)),
  target: $rawWallets,
});

sample({
  clock: updateWallet,
  source: $rawWallets,
  fn: (wallets, { walletId, data }) => wallets.map((w) => (w.id === walletId ? { ...w, ...data } : w)),
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

sample({
  clock: updateWalletsFx.doneData,
  source: $rawWallets,
  fn: (wallets, updated) => {
    const updatedMap = updated.reduce<Record<string, Wallet>>((acc, w) => {
      acc[w.id] = w;
      return acc;
    }, {});

    return wallets.map((w) => {
      const u = updatedMap[w.id];
      return u ? { ...w, ...u } : w;
    });
  },
  target: $rawWallets,
});

export const walletModel = {
  $wallets,
  $allWallets: readonly($allWallets),
  $hiddenWallets,
  $availableAccounts,
  $isLoadingWallets: or(not($populated), fetchAllWalletsFx.pending),

  createWallet: createWalletFx,
  createWallets: createWalletsFx,
  updateWallets: updateWalletsFx,
  updateWallet: updateWalletFx,
  populate: fetchAllWalletsFx,
  walletHidden: walletHiddenFx,
  hideWallets: hideWalletsFx,
  walletsRemoved: walletsRemovedFx,
  restoreWallets: restoreWalletsFx,

  events: {
    createWatchOnly,
    createSingleshard,
    createMultisig,
    createFlexibleMultisig,
    createWalletConnect,
    createProxied,
    walletCreatedDone,
    walletCreationFail,
    updateWallet,
    updateWalletWithDB,
    removeWallet,
    walletRemovedSuccess: removeWalletFx.done,
  },

  __test: {
    $rawWallets,
    walletCreatedFx: createWalletFx,
    removeWalletsFx,
  },
};
