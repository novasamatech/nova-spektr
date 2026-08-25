import { type Chain, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';

type Params = {
  /** Own accounts with their names already resolved (`useAccountsNames`). */
  accounts: AnyAccount[];
  /** Wallets with their names already resolved (`useWalletsNames`). */
  wallets: Pick<Wallet, 'id' | 'name'>[];
  chain: Chain;
  query: string;
  /** An account that must not be offered — the sender of a transfer. */
  excludeAccountId?: AccountId | null;
};

/**
 * Own accounts offered as recipients: everything that can receive on the chain
 * (see `accountService.canReceiveOnChain`), minus the excluded account,
 * searched over what the row shows — the resolved account name, the resolved
 * wallet name and the displayed address (`accountService.searchAccounts`).
 */
export function filterRecipientAccounts({ accounts, wallets, chain, query, excludeAccountId }: Params): AnyAccount[] {
  const receivableAccounts = accounts.filter((account) => {
    if (!accountService.canReceiveOnChain(account, chain)) return false;

    return !nonNullable(excludeAccountId) || excludeAccountId !== account.accountId;
  });

  return accountService.searchAccounts({
    accounts: receivableAccounts,
    query,
    resolvedAccounts: receivableAccounts,
    resolvedWallets: wallets,
    addressPrefix: chain.addressPrefix,
  });
}
