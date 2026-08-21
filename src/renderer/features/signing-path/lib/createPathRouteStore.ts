import { type Store, combine } from 'effector';

import { type Chain } from '@/shared/core';
import { nonNullable, nullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

import { createSyntheticProxiedAccount, scopeProxiedAccount } from './path-account-resolution';

/**
 * A flex multisig answers to two accountIds — `accountId` is the pure-proxy
 * facade, `multisigAccountId` is the inner multisig — and the path spends two
 * hops on it: `proxied(facade) → multisig(inner)`. The second hop collapses
 * onto the account already resolved for the first, so the match is made against
 * that _resolved account_, never by searching the account list for "something
 * whose inner multisig has this id".
 *
 * Searching would let a flex account answer a `multisig` node it has no
 * business answering — a plain `multisig -> signer` path would become
 * `asMulti(proxy.proxy(real = facade, ...))`, executing from a pure proxy the
 * user never picked while every UI surface still shows the saved multisig.
 */
const collapsesOntoFlexAccount = (
  previousAccount: AnyAccount | undefined,
  node: PathNode,
  previousNode: PathNode | undefined,
): boolean => {
  return (
    nonNullable(previousAccount) &&
    node.kind === 'multisig' &&
    accountUtils.isFlexibleMultisigAccount(previousAccount) &&
    previousAccount.multisigAccountId === node.accountId &&
    previousNode?.kind === 'proxied' &&
    previousNode.accountId === previousAccount.accountId
  );
};

const matchesNode = (account: AnyAccount, node: PathNode): boolean => {
  if (node.kind === 'proxied') {
    return (
      (accountUtils.isProxiedAccount(account) && account.accountId === node.accountId) ||
      (accountUtils.isFlexibleMultisigAccount(account) && account.accountId === node.accountId)
    );
  }
  if (node.kind === 'multisig') {
    return accountUtils.isMultisigAccount(account) && account.accountId === node.accountId;
  }
  return account.accountId === node.accountId;
};

const resolveProxiedNodeAccount = (
  chainAccounts: AnyAccount[],
  node: PathNode,
  nextNode: PathNode | undefined,
  chain: Chain,
): AnyAccount | null => {
  const proxiedAccount = chainAccounts.find((a) => accountUtils.isProxiedAccount(a) && a.accountId === node.accountId);
  if (proxiedAccount) {
    return scopeProxiedAccount(proxiedAccount, nextNode?.accountId, node.proxyType);
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

export type PathResolution = {
  /** Resolved accounts, or null for a trivial path / an unresolvable node. */
  route: AnyAccount[] | null;
  /**
   * The first node with no matching local account. Non-null only when the path
   * itself is resolvable in principle (length >= 2) but an account is missing,
   * so callers can name the account the user has to add.
   */
  missingNode: PathNode | null;
};

/**
 * Resolves `$signingPath` to concrete accounts. Reports the node that could not
 * be resolved so the caller can tell the user _which_ account is missing rather
 * than that "something" is unresolvable.
 */
export const createPathResolutionStore = (
  signingPath: Store<PathNode[]>,
  chain: Store<Chain | null>,
): Store<PathResolution> =>
  combine(
    { path: signingPath, allAccounts: accounts.$list, chainValue: chain },
    ({ path, allAccounts, chainValue }): PathResolution => {
      if (nullable(chainValue) || path.length < 2) return { route: null, missingNode: null };

      const chainAccounts = accountService.filterAccountsOnChain(allAccounts, chainValue);

      const resolved: AnyAccount[] = [];
      for (const [index, node] of path.entries()) {
        // For proxied nodes prefer a concrete ProxiedAccount over a flex-multisig
        // facade sharing the same accountId — otherwise the wrong forceProxyType
        // ends up in the extrinsic when both exist in the wallet (SPEK-558).
        const nextNode = path[index + 1];
        const previousNode = path[index - 1];
        const previousAccount = resolved.at(-1);
        // The flex facade resolved for the previous `proxied` node also *is*
        // this multisig hop — take it directly, so a stand-alone MultisigAccount
        // sharing the inner accountId can't win the `find` below and add a
        // second `asMulti` wrapper on top of the flex one.
        const account = collapsesOntoFlexAccount(previousAccount, node, previousNode)
          ? previousAccount
          : node.kind === 'proxied'
            ? resolveProxiedNodeAccount(chainAccounts, node, nextNode, chainValue)
            : chainAccounts.find((a) => matchesNode(a, node));
        if (!account) return { route: null, missingNode: node };

        // Flex multisig spans two consecutive hops as one account; its
        // transformer wraps both layers in a single step.
        if (resolved.at(-1) !== account) resolved.push(account);
      }

      return { route: resolved, missingNode: null };
    },
  );

/**
 * Resolves `$signingPath` to `AnyAccount[]` for `createComplexTxStore`'s
 * `routeOverride`. Returns null for trivial paths or unresolvable nodes — the
 * tx store falls back to its BFS route in that case.
 */
export const createPathRouteStore = (
  signingPath: Store<PathNode[]>,
  chain: Store<Chain | null>,
): Store<AnyAccount[] | null> => createPathResolutionStore(signingPath, chain).map(({ route }) => route);
