import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { createSyntheticProxiedAccount } from './path-account-resolution';

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

const scopeProxiedAccount = (account: AnyAccount, node: PathNode, nextNode: PathNode | undefined): AnyAccount => {
  if (!node.proxyType || !nextNode || !accountUtils.isProxiedAccount(account)) {
    return account;
  }

  const connections = account.connections.filter(
    (connection) => connection.proxyAccountId === nextNode.accountId && connection.proxyType === node.proxyType,
  );

  return {
    ...account,
    connections:
      connections.length > 0
        ? connections
        : [{ proxyAccountId: nextNode.accountId, proxyType: node.proxyType as never, delay: 0 }],
  } as AnyAccount;
};

const resolveProxiedNodeAccount = (
  chainAccounts: AnyAccount[],
  node: PathNode,
  nextNode: PathNode | undefined,
  chain: Chain,
): AnyAccount | null => {
  const proxiedAccount = chainAccounts.find((a) => accountUtils.isProxiedAccount(a) && a.accountId === node.accountId);
  if (proxiedAccount) {
    return scopeProxiedAccount(proxiedAccount, node, nextNode);
  }

  const flexAccount = chainAccounts.find(
    (a) => accountUtils.isFlexibleMultisigAccount(a) && a.accountId === node.accountId,
  );
  if (flexAccount) {
    return flexAccount;
  }

  if (!node.proxyType || !nextNode) {
    return null;
  }

  const sameAddressAccount = chainAccounts.find((a) => a.accountId === node.accountId);

  return createSyntheticProxiedAccount({
    baseAccount: sameAddressAccount,
    accountId: node.accountId,
    chainId: chain.chainId,
    proxyAccountId: nextNode.accountId,
    proxyType: node.proxyType,
  });
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
        const nextNode = path[index + 1];
        const account =
          node.kind === 'proxied'
            ? resolveProxiedNodeAccount(chainAccounts, node, nextNode, chainValue)
            : chainAccounts.find((a) => matchesNode(a, node));
        if (!account) return null;

        // Flex multisig spans two consecutive hops as one account; its
        // transformer wraps both layers in a single step.
        if (resolved.at(-1) !== account) resolved.push(account);
      }

      return resolved;
    },
  );
