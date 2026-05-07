import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';

/**
 * Resolves `$signingPath` to `AnyAccount[]` for `createComplexTxStore`'s
 * `routeOverride`. Returns null for trivial paths or unresolvable nodes —
 * the tx store falls back to its BFS route in that case.
 */
export const createPathRouteStore = (
  signingPath: Store<PathNode[]>,
  chain: Store<Chain | null>,
): Store<AnyAccount[] | null> =>
  combine(
    { path: signingPath, allAccounts: accounts.$list, chainValue: chain },
    ({ path, allAccounts, chainValue }): AnyAccount[] | null => {
      if (nullable(chainValue) || path.length < 2) return null;

      const resolved: AnyAccount[] = [];
      for (const node of path) {
        const account = allAccounts.find(
          (a) => a.accountId === node.accountId && accountService.isAccountAvailableOnChain(a, chainValue),
        );
        if (!account) return null;
        resolved.push(account);
      }

      return resolved;
    },
  );
