import { type AccountNode, type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';

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
    let pathParents: AnyAccount[] = [];

    accountService.traverseGraph(node, {
      enter(node) {
        if (node.account === account) {
          for (const parent of pathParents) {
            result.add(parent);
          }

          return false; // Stop traversing this path
        }

        const children = node.children.filter((child) => !accountUtils.isMultisigSignatoryAccount(child.account));

        if (children.length === 1) {
          pathParents.push(node.account);
        } else if (children.length > 1) {
          pathParents = []; // Clear the path
        }
      },
    });
  }

  return Array.from(result.values());
}
