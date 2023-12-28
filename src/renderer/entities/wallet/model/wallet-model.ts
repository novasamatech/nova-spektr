import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { spread } from 'patronum';

import type {
  Account,
  BaseAccount,
  ChainAccount,
  ID,
  MultisigAccount,
  NoID,
  ProxiedAccount,
  Wallet,
} from '@shared/core';
import { kernelModel, WalletConnectAccount } from '@shared/core';
import { storageService } from '@shared/api/storage';
import { modelUtils } from '../lib/model-utils';
import { accountUtils } from '../lib/account-utils';
import { walletUtils } from '../lib/wallet-utils';

const $wallets = createStore<Wallet[]>([]);
const $activeWallet = combine(
  $wallets,
  (wallets): Wallet | undefined => {
    return wallets.find((wallet) => wallet.isActive);
  },
  { skipVoid: false },
);

const $accounts = createStore<Account[]>([]);
const $activeAccounts = combine(
  {
    wallet: $activeWallet,
    accounts: $accounts,
  },
  ({ wallet, accounts }): Account[] => {
    if (!wallet) return [];

    return accounts.filter((account) => account.walletId === wallet.id);
  },
);

type CreateParams<T extends Account> = {
  wallet: Omit<NoID<Wallet>, 'isActive'>;
  accounts: Omit<NoID<T>, 'walletId'>[];
};
type MultisigUpdateParams = Partial<MultisigAccount> & { id: Account['id'] };

const watchOnlyCreated = createEvent<CreateParams<BaseAccount>>();
const multishardCreated = createEvent<CreateParams<BaseAccount | ChainAccount>>();
const singleshardCreated = createEvent<CreateParams<BaseAccount>>();
const multisigCreated = createEvent<CreateParams<MultisigAccount>>();
const walletConnectCreated = createEvent<CreateParams<WalletConnectAccount>>();
const proxiedesCreated = createEvent<CreateParams<ProxiedAccount>[]>();

const walletSelected = createEvent<ID>();
const multisigAccountUpdated = createEvent<MultisigUpdateParams>();
const walletRemoved = createEvent<ID>();

const fetchAllAccountsFx = createEffect((): Promise<Account[]> => {
  return storageService.accounts.readAll();
});

const fetchAllWalletsFx = createEffect((): Promise<Wallet[]> => {
  return storageService.wallets.readAll();
});

type CreateResult = {
  wallet: Wallet;
  accounts: Account[];
};
const walletCreatedFx = createEffect(
  async ({
    wallet,
    accounts,
  }: CreateParams<BaseAccount | WalletConnectAccount | ProxiedAccount>): Promise<CreateResult | undefined> => {
    const dbWallet = await storageService.wallets.create({ ...wallet, isActive: false });

    if (!dbWallet) return undefined;

    const accountsPayload = accounts.map((account) => ({ ...account, walletId: dbWallet.id }));
    const dbAccounts = await storageService.accounts.createAll(accountsPayload);

    if (!dbAccounts) return undefined;

    return { wallet: dbWallet, accounts: dbAccounts };
  },
);

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

// TODO: Move wallet creation to it's own feature
const proxiedesCreatedFx = createEffect(
  async (proxiedes: CreateParams<ProxiedAccount>[]): Promise<(CreateResult | undefined)[]> => {
    return Promise.all(proxiedes.map((p) => walletCreatedFx(p)));
  },
);

type SelectParams = {
  prevId?: ID;
  nextId: ID;
};
const walletSelectedFx = createEffect(async ({ prevId, nextId }: SelectParams): Promise<ID | undefined> => {
  if (!prevId) {
    return storageService.wallets.update(nextId, { isActive: true });
  }

  // TODO: consider using Dexie transaction() | Task --> https://app.clickup.com/t/8692uyemn
  const [, nextWallet] = await Promise.all([
    storageService.wallets.update(prevId, { isActive: false }),
    storageService.wallets.update(nextId, { isActive: true }),
  ]);

  return nextWallet ? nextId : undefined;
});

const multisigWalletUpdatedFx = createEffect(
  async (account: MultisigUpdateParams): Promise<MultisigUpdateParams | undefined> => {
    const id = await storageService.accounts.update(account.id, account);

    return id ? account : undefined;
  },
);

type RemoveParams = {
  walletId: ID;
  accountIds: ID[];
};
const removeWalletFx = createEffect(async ({ walletId, accountIds }: RemoveParams): Promise<ID> => {
  await Promise.all([storageService.accounts.deleteAll(accountIds), storageService.wallets.delete(walletId)]);

  return walletId;
});

sample({
  clock: kernelModel.events.appStarted,
  target: [fetchAllWalletsFx, fetchAllAccountsFx],
});
sample({
  clock: fetchAllWalletsFx.doneData,
  target: $wallets,
});
sample({
  clock: fetchAllAccountsFx.doneData,
  target: $accounts,
});

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
  filter: (_, nextId) => Boolean(nextId),
  fn: (wallets, nextId) => {
    return wallets.map((wallet) => ({ ...wallet, isActive: wallet.id === nextId }));
  },
  target: $wallets,
});

sample({
  clock: walletConnectCreated,
  target: walletCreatedFx,
});

sample({
  clock: [watchOnlyCreated, multisigCreated, singleshardCreated],
  target: walletCreatedFx,
});
sample({
  clock: multishardCreated,
  target: multishardCreatedFx,
});

sample({
  clock: proxiedesCreated,
  target: proxiedesCreatedFx,
});

sample({
  clock: [walletCreatedFx.doneData, multishardCreatedFx.doneData],
  source: { wallets: $wallets, accounts: $accounts },
  filter: (_, data) => Boolean(data),
  fn: ({ wallets, accounts }, data) => ({
    wallets: wallets.concat(data!.wallet),
    accounts: accounts.concat(data!.accounts),
  }),
  target: spread({
    targets: { wallets: $wallets, accounts: $accounts },
  }),
});

sample({
  clock: [walletCreatedFx.doneData, multishardCreatedFx.doneData],
  filter: (data: CreateResult | undefined): data is CreateResult => {
    return Boolean(data) && !walletUtils.isProxied(data?.wallet);
  },
  fn: (data) => data.wallet.id,
  target: walletSelected,
});

sample({
  clock: multisigAccountUpdated,
  target: multisigWalletUpdatedFx,
});

sample({
  clock: multisigWalletUpdatedFx.doneData,
  source: $accounts,
  filter: (_, data) => Boolean(data),
  fn: (accounts, data) => {
    return accounts.map((account) => (account.id === data!.id ? { ...account, ...data } : account));
  },
  target: $accounts,
});

sample({
  clock: walletRemoved,
  source: $accounts,
  fn: (accounts, walletId) => ({
    accountIds: accountUtils.getWalletAccounts(walletId, accounts).map((a) => a.id),
    walletId,
  }),
  target: removeWalletFx,
});

sample({
  clock: removeWalletFx.doneData,
  source: { wallets: $wallets, accounts: $accounts },
  fn: ({ accounts, wallets }, walletId) => ({
    accounts: accounts.filter((a) => a.walletId !== walletId),
    wallets: wallets.filter((w) => w.id !== walletId),
  }),
  target: spread({
    targets: { wallets: $wallets, accounts: $accounts },
  }),
});

sample({
  clock: removeWalletFx.doneData,
  source: {
    activeWallet: $activeWallet,
    wallets: $wallets,
  },
  filter: ({ activeWallet }, walletId) => activeWallet?.id === walletId,
  fn: ({ wallets }) => ({
    nextId: wallets[0].id,
  }),
  target: walletSelectedFx,
});

export const walletModel = {
  $wallets,
  $activeWallet,
  $accounts,
  $activeAccounts,
  $isLoadingWallets: fetchAllWalletsFx.pending,
  events: {
    watchOnlyCreated,
    multishardCreated,
    singleshardCreated,
    multisigCreated,
    walletConnectCreated,
    proxiedesCreated,
    walletSelected,
    multisigAccountUpdated,
    walletRemoved,
    walletRemovedSuccess: removeWalletFx.done,
  },
};
