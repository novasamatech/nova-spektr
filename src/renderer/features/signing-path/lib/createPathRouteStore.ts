import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

// Flex multisig is one account that answers to two accountIds: `accountId`
// is the proxy facade, `multisigAccountId` is the inner multisig.
const ownsAccountId = (account: AnyAccount, id: AccountId): boolean =>
  account.accountId === id || (accountUtils.isFlexibleMultisigAccount(account) && account.multisigAccountId === id);

/**
 * Resolves `$signingPath` to `AnyAccount[]` for `createComplexTxStore`'s
 * `routeOverride`. Returns null for trivial paths or unresolvable nodes — the
 * tx store falls back to its BFS route in that case.
 */
export const createPathRouteStore = (
  signingPath: Store<PathNode[]>,
  chain: Store<Chain | null>,
): Store<AnyAccount[] | null> =>
  combine(
    { path: signingPath, allAccounts: accounts.$list, chainValue: chain },
    ({ path, allAccounts, chainValue }): AnyAccount[] | null => {
      if (nullable(chainValue) || path.length < 2) return null;

      const chainAccounts = accountService.filterAccountsOnChain(allAccounts, chainValue);

      const resolved: AnyAccount[] = [];
      for (const node of path) {
        const account = chainAccounts.find((a) => ownsAccountId(a, node.accountId));
        if (!account) return null;
        // Flex multisig spans two consecutive hops as one account; its
        // transformer wraps both layers in a single step.
        if (resolved.at(-1) !== account) resolved.push(account);
      }

      return resolved;
    },
  );
