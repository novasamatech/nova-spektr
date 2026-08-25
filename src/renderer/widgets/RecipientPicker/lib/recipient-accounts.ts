import { type Chain } from '@/shared/core';
import { includesMultiple, nonNullable, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';

type Params<T extends AnyAccount> = {
  accounts: T[];
  chain: Chain;
  query: string;
  /** An account that must not be offered — the sender of a transfer. */
  excludeAccountId?: AccountId | null;
};

/**
 * Own accounts offered as recipients: everything that can receive on the chain
 * (see `accountService.canReceiveOnChain`), minus the excluded account,
 * matching the query by name or displayed address.
 */
export function filterRecipientAccounts<T extends AnyAccount>({ accounts, chain, query, excludeAccountId }: Params<T>) {
  return accounts.filter((account) => {
    if (!accountService.canReceiveOnChain(account, chain)) return false;
    if (nonNullable(excludeAccountId) && excludeAccountId === account.accountId) return false;

    const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

    return includesMultiple([account.name, address], query);
  });
}
