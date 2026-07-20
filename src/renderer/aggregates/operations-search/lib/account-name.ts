import { type Chain, type Contact } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type IdentityMap, accountService } from '@/domains/network';

export type AccountNameSources = {
  accounts: AnyAccount[];
  contacts: Contact[];
  identities: IdentityMap;
  chains: Record<string, Chain>;
};

export type AccountNameResolver = (accountId: AccountId, chain?: Chain | null) => string;

/**
 * Resolves the name a row actually displays for an account — the same `custom
 * name → local contact → backend contact → identity → wallet name → short
 * address` chain `<NamedAccount>` renders.
 *
 * Deliberately calls the pure service instead of `useAccountName` /
 * `accountNameResource`: operations are filtered inside an Effector `combine`
 * where hooks are unavailable, and a cache read would be best-effort (populated
 * only for accounts some component happened to render). Mirrors the existing
 * `getWalletSearchEntries` approach.
 *
 * The returned resolver memoizes per `accountId:chainId` because the search
 * runs over every row on every keystroke, while `resolveAccountName` scans the
 * contact and account lists on each call.
 */
export const createAccountNameResolver = (sources: AccountNameSources): AccountNameResolver => {
  const cache = new Map<string, string>();

  return (accountId, chain) => {
    const key = `${accountId}:${chain?.chainId ?? 'anyChain'}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;

    const name = accountService.resolveAccountName({ accountId, chain, ...sources });
    cache.set(key, name);

    return name;
  };
};
