import { accountService, AnyAccount } from '@/domains/network';
import { AccountNode } from '@/domains/network/account/types';
export const forgetService = {
  findParentAccounts,
};

/**
 * Finds all parent accounts of given account in the graph if there is only one
 * child account that exists.
 *
 * @param graph - The graph of accounts.
 * @param account - The account to find parents for.
 *
 * @returns - An array accounts.
 */
function findParentAccounts(graph: Map<AnyAccount, AccountNode>, account: AnyAccount) {
  const result = new Set<AnyAccount>();

  for (const node of graph.values()) {
    accountService.traverseGraph(node, {
      enter(node) {
        if (node.account === account) {
          return false;
        }

        // const childrenWithPermission = node.children.filter((c) =>
        //   accountService.hasPermissionToMakeActions(c.account),
        // );
        // console.log('childrenWithPermission', { node });

        if (node.children.length === 1) {
          result.add(node.account);
        } else if (node.children.length > 1) {
          result.clear();
        }
      },
      exit(node) {
        result.delete(node.account);
      },
    });
  }

  return Array.from(result.values());
}
