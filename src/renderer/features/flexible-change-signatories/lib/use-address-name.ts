import { useUnit } from 'effector-react';

import { type Address, type Chain } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useAccountsNames, useWalletsNames } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { walletModel } from '@/entities/wallet';

/**
 * Resolves a human-readable name for any address by checking, in order: own
 * wallet accounts (with on-chain identity / custom name resolution), then the
 * address book. Returns null when nothing matches.
 *
 * Use the same name source everywhere addresses are surfaced so that custom
 * wallet names and identity entries stay consistent across the flow.
 */
export const useAddressName = (address: Address | AccountId | null | undefined, chain: Chain | null): string | null => {
  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$availableAccounts);
  const contacts = useUnit(contactModel.$contacts);

  const resolvedAccounts = useAccountsNames(accounts, chain);
  const resolvedWallets = useWalletsNames(wallets);

  if (!address) return null;
  const accountId = toAccountId(address);

  const account = resolvedAccounts.find((a) => a.accountId === accountId);
  if (account) {
    const wallet = resolvedWallets.find((w) => w.id === account.walletId);
    if (wallet && wallet.name !== account.name) return `${wallet.name} (${account.name})`;
    return account.name;
  }

  const contact = contacts.find((c) => toAccountId(c.address) === accountId);
  if (contact) return contact.name;

  return null;
};
