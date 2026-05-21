import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

const matchesNode = (account: AnyAccount, node: PathNode): boolean => {
  if (node.kind === 'proxied') {
    return (
      (accountUtils.isProxiedAccount(account) && account.accountId === node.accountId) ||
      (accountUtils.isFlexibleMultisigAccount(account) && account.accountId === node.accountId)
    );
  }
  if (node.kind === 'multisig') {
    return (
      (accountUtils.isMultisigAccount(account) && account.accountId === node.accountId) ||
      (accountUtils.isFlexibleMultisigAccount(account) && account.multisigAccountId === node.accountId)
    );
  }
  return account.accountId === node.accountId;
};

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
      for (const [index, node] of path.entries()) {
        // For proxied nodes prefer a concrete ProxiedAccount over a flex-multisig
        // facade sharing the same accountId — otherwise the wrong forceProxyType
        // ends up in the extrinsic when both exist in the wallet (SPEK-558).
        const account =
          node.kind === 'proxied'
            ? (chainAccounts.find((a) => accountUtils.isProxiedAccount(a) && a.accountId === node.accountId) ??
              chainAccounts.find((a) => matchesNode(a, node)))
            : chainAccounts.find((a) => matchesNode(a, node));
        if (!account) return null;

        const nextNode = path[index + 1];
        const scopedAccount =
          node.kind === 'proxied' && node.proxyType && nextNode && accountUtils.isProxiedAccount(account)
            ? {
                ...account,
                connections: account.connections.filter(
                  (connection) =>
                    connection.proxyAccountId === nextNode.accountId && connection.proxyType === node.proxyType,
                ),
              }
            : account;
        // Flex multisig spans two consecutive hops as one account; its
        // transformer wraps both layers in a single step.
        if (resolved.at(-1) !== scopedAccount) resolved.push(scopedAccount);
      }

      return resolved;
    },
  );
