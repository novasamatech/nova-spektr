import { type Chain, type Contact, type Wallet } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type IdentityMap, accountService } from '@/domains/network';

export type AccountNameSources = {
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
  chains: Record<string, Chain>;
};

export type SearchResolvers = {
  resolveAccountName: (accountId: AccountId, chain?: Chain | null) => string;
  /**
   * Separate from the account name because `resolveAccountName` has no wallet
   * step, while `<NamedAccount wallet={…}>` passes the wallet name as `title` —
   * a hard override. Without this, a row showing a wallet name is
   * unsearchable.
   */
  resolveWalletName: (accountId: AccountId, chain?: Chain | null) => string | null;
  resolveAddress: (accountId: AccountId, chain?: Chain | null) => string;
};

const cacheKey = (accountId: AccountId, chain?: Chain | null) => `${accountId}:${chain?.chainId ?? 'anyChain'}`;

/**
 * Uses the pure services rather than `useAccountName` / `accountNameResource`:
 * operations are filtered inside an Effector `combine` where hooks are
 * unavailable, and the resource cache is only populated for accounts some
 * component happened to render.
 *
 * The caches are bound to this `sources` snapshot and must never outlive it, or
 * they would serve stale names — hence rebuilding on every source change.
 */
export const createSearchResolvers = (sources: AccountNameSources, wallets: Wallet[]): SearchResolvers => {
  const nameCache = new Map<string, string>();
  const walletNameCache = new Map<string, string | null>();
  const addressCache = new Map<string, string>();

  return {
    resolveAccountName(accountId, chain) {
      const key = cacheKey(accountId, chain);
      const cached = nameCache.get(key);
      if (cached !== undefined) return cached;

      const name = accountService.resolveAccountName({ accountId, chain, ...sources });
      nameCache.set(key, name);

      return name;
    },

    resolveWalletName(accountId, chain) {
      const key = cacheKey(accountId, chain);
      const cached = walletNameCache.get(key);
      if (cached !== undefined) return cached;

      const account = accountService.findRelatedAccount(sources.accounts, accountId, chain ?? undefined);
      const wallet = account ? wallets.find(w => w.id === account.walletId) : undefined;
      const name = wallet ? accountService.resolveWalletName({ wallet, ...sources }) : null;
      walletNameCache.set(key, name);

      return name;
    },

    resolveAddress(accountId, chain) {
      const key = cacheKey(accountId, chain);
      const cached = addressCache.get(key);
      if (cached !== undefined) return cached;

      const address = toAddress(accountId, { prefix: chain?.addressPrefix });
      addressCache.set(key, address);

      return address;
    },
  };
};
