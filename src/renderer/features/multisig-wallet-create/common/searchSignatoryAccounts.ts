import { type Wallet } from '@/shared/core';
import { performSearch, toAddress } from '@/shared/lib/utils';
import { type AnyAccount } from '@/domains/network';

type SearchMeta = {
  displayName: string;
  walletName: string;
  displayAddress: string;
};

type Params = {
  accounts: AnyAccount[];
  query: string;
  resolvedAccounts: Pick<AnyAccount, 'accountId' | 'name'>[];
  resolvedWallets: Pick<Wallet, 'id' | 'name'>[];
  addressPrefix?: number;
};

/**
 * Searches signatory account candidates by the strings a user actually sees in
 * the dropdown — resolved account name, resolved wallet name and displayed
 * address — instead of the raw stored account name.
 */
export const searchSignatoryAccounts = ({
  accounts,
  query,
  resolvedAccounts,
  resolvedWallets,
  addressPrefix,
}: Params): AnyAccount[] => {
  return performSearch<AnyAccount, SearchMeta>({
    records: accounts,
    query,
    getMeta: account => ({
      displayName: resolvedAccounts.find(a => a.accountId === account.accountId)?.name ?? account.name,
      walletName: resolvedWallets.find(w => w.id === account.walletId)?.name ?? '',
      displayAddress: toAddress(account.accountId, { prefix: addressPrefix }),
    }),
    weights: { displayName: 1, walletName: 0.75, displayAddress: 0.5 },
  });
};
