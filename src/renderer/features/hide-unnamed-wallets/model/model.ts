import { attach, combine, createStore, sample } from 'effector';

import { type Contact, type Wallet, AccountNameType } from '@/shared/core';
import { keys } from '@/shared/lib/utils';
import { type AnyAccount, type IdentityMap, accountService, accounts, identity } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel, walletUtils } from '@/entities/wallet';
import { walletSelectUI } from '@/features/wallet-select';

const getIdentityAccountIds = (identities: IdentityMap): Set<string> => {
  const accountIds = new Set<string>();

  for (const chainId of keys(identities)) {
    for (const accountId of keys(identities[chainId] ?? {})) {
      accountIds.add(accountId);
    }
  }

  return accountIds;
};

const groupAccountsByWallet = (accounts: AnyAccount[]): Map<number, AnyAccount[]> => {
  const accountsByWallet = new Map<number, AnyAccount[]>();

  for (const account of accounts) {
    const walletAccounts = accountsByWallet.get(account.walletId);
    if (walletAccounts) {
      walletAccounts.push(account);
    } else {
      accountsByWallet.set(account.walletId, [account]);
    }
  }

  return accountsByWallet;
};

const getWalletAccount = (wallet: Wallet, walletAccounts: AnyAccount[]): AnyAccount | null => {
  const accountId = accountService.getWalletAccountId(wallet, walletAccounts);
  if (!accountId) return null;

  return walletAccounts.find((account) => account.accountId === accountId) ?? null;
};

const getContactAccountIds = (contacts: Contact[]): Set<string> => {
  return new Set(contacts.map((contact) => contact.accountId));
};

const $autoNamedWallets = combine(
  {
    wallets: walletModel.$allWallets,
    accounts: accounts.$list,
    contacts: contactModel.$contacts,
    identities: identity.$list,
  },
  ({ wallets, accounts, contacts, identities }) => {
    const accountsByWallet = groupAccountsByWallet(accounts);
    const contactAccountIds = getContactAccountIds(contacts);
    const identityAccountIds = getIdentityAccountIds(identities);

    return wallets.filter((wallet) => {
      const isTargetType = walletUtils.isAnyMultisig(wallet) || walletUtils.isProxied(wallet);
      if (!isTargetType) return false;

      const walletAccounts = accountsByWallet.get(wallet.id) ?? [];
      if (walletAccounts.length === 0) return false;

      const walletAccount = getWalletAccount(wallet, walletAccounts);
      if (!walletAccount) return false;

      return (
        walletAccount.nameType !== AccountNameType.CUSTOM &&
        !contactAccountIds.has(walletAccount.accountId) &&
        !identityAccountIds.has(walletAccount.accountId)
      );
    });
  },
);

const $visibleAutoNamed = $autoNamedWallets.map((wallets) => wallets.filter((w) => !w.hiddenReason));
const $hiddenAutoNamed = $autoNamedWallets.map((wallets) => wallets.filter((w) => w.hiddenReason === 'unnamed'));

const $mode = combine($visibleAutoNamed, $hiddenAutoNamed, (visible, hidden): 'hide' | 'unhide' | 'none' => {
  if (visible.length > 0) return 'hide';
  if (hidden.length > 0) return 'unhide';
  return 'none';
});

const $optimisticMode = createStore<'hide' | 'unhide' | null>(null);
const $displayMode = combine($mode, $optimisticMode, (mode, optimisticMode) => optimisticMode ?? mode);

const hideAllFx = attach({
  source: $visibleAutoNamed,
  effect: async (wallets: Wallet[]) => {
    if (wallets.length === 0) return [];
    await walletModel.hideWallets(wallets);
    return wallets;
  },
});

const unhideAllFx = attach({
  source: $hiddenAutoNamed,
  effect: async (wallets: Wallet[]) => {
    if (wallets.length === 0) return [];
    await walletModel.restoreWallets(wallets);
    return wallets;
  },
});

$optimisticMode
  .on(hideAllFx, () => 'unhide' as const)
  .on(unhideAllFx, () => 'hide' as const)
  .reset([hideAllFx.finally, unhideAllFx.finally]);

sample({
  clock: [hideAllFx, unhideAllFx],
  fn: () => true,
  target: walletSelectUI.dropdownLoadingChanged,
});

sample({
  clock: [hideAllFx.finally, unhideAllFx.finally],
  fn: () => false,
  target: walletSelectUI.dropdownLoadingChanged,
});

export const hideUnnamedWalletsModel = {
  $mode,
  $displayMode,
  $isUpdating: combine(hideAllFx.pending, unhideAllFx.pending, (isHiding, isUnhiding) => isHiding || isUnhiding),
  $visibleAutoNamed,
  $hiddenAutoNamed,
  hideAll: hideAllFx,
  unhideAll: unhideAllFx,
};
