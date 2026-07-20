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

/**
 * The three strings a row can show for an account. Grouped so callers pass one
 * object and every resolver shares the same source snapshot.
 */
export type SearchResolvers = {
  /** The `<NamedAccount>` resolution chain, minus the wallet-name override. */
  resolveAccountName: (accountId: AccountId, chain?: Chain | null) => string;
  /**
   * The wallet name `<NamedAccount wallet={…}>` displays. Separate because
   * `resolveAccountName` has no wallet step — its last resort before the short
   * address is the _account_ name — while a wallet name enters as `title`, a
   * hard override. A row showing a wallet name is otherwise unsearchable.
   */
  resolveWalletName: (accountId: AccountId, chain?: Chain | null) => string | null;
  /** SS58 address at the given chain's prefix, or the default prefix. */
  resolveAddress: (accountId: AccountId, chain?: Chain | null) => string;
};

const cacheKey = (accountId: AccountId, chain?: Chain | null) => `${accountId}:${chain?.chainId ?? 'anyChain'}`;

/**
 * Builds the resolvers over one snapshot of the domain stores.
 *
 * Deliberately calls the pure services instead of `useAccountName` /
 * `accountNameResource`: operations are filtered inside an Effector `combine`
 * where hooks are unavailable, and a cache read would be best-effort (populated
 * only for accounts some component happened to render). Mirrors the existing
 * `getWalletSearchEntries` approach.
 *
 * Every resolver memoizes, because the search runs over every row on each
 * keystroke while `resolveAccountName` scans the contact and account lists and
 * `toAddress` runs a blake2b checksum. The caches are bound to this snapshot
 * and must never outlive it, or they would serve stale names — which is why the
 * resolvers are rebuilt whenever the sources change, and only then.
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
