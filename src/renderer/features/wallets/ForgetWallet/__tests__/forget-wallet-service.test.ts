import { type AccountNode, type AnyAccount } from '@/domains/network';
import { forgetService } from '../service';

import { accounts } from './mocks';

describe('forgetService.findParentAccounts', () => {
  let testGraph: Map<AnyAccount, AccountNode>;
  beforeEach(() => {
    testGraph = new Map();
  });

  it('should return empty array when account has no parents', () => {
    // Create a simple graph with just one account (no parents)
    const node: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };
    testGraph.set(accounts.walletConnect, node);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should find parent when there is a single-child path to target account', () => {
    // Create: Parent -> Child (target)
    const childNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [childNode],
    };

    testGraph.set(accounts.multisig1, parentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toContain(accounts.multisig1);
  });

  it('should not return parent when parent has multiple children', () => {
    // Create: Parent -> [Child1, Child2 (target)]
    const targetChild: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const otherChild: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetChild, otherChild],
    };

    testGraph.set(accounts.multisig1, parentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should handle complex hierarchical structure', () => {
    // Create: GrandParent -> Parent -> Target
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode],
    };

    const grandParentNode: AccountNode = {
      account: accounts.proxy1,
      children: [parentNode],
    };

    testGraph.set(accounts.proxy1, grandParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Both grandparent and parent should be in result since they each have only one child
    expect(result).toContain(accounts.proxy1);
    expect(result).toContain(accounts.multisig1);
  });

  it('should clear results when encountering parent with multiple children in the path', () => {
    // Create: GrandParent -> Parent (with multiple children) -> Target
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const siblingNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode, siblingNode],
    };

    const grandParentNode: AccountNode = {
      account: accounts.proxy1,
      children: [parentNode],
    };

    testGraph.set(accounts.proxy1, grandParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    expect(result).toEqual([]);
  });

  it('should handle multiple separate trees in the graph', () => {
    // Tree 1: Parent1 -> Target
    const targetInTree1: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const parentInTree1: AccountNode = {
      account: accounts.multisig1,
      children: [targetInTree1],
    };

    // Tree 2: Parent2 -> OtherAccount (not the target)
    const otherAccountNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const parentInTree2: AccountNode = {
      account: accounts.multisig2,
      children: [otherAccountNode],
    };

    testGraph.set(accounts.multisig1, parentInTree1);
    testGraph.set(accounts.multisig2, parentInTree2);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Should only find parent from the tree containing the target
    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
  });

  it('should return empty array when target account is not found in graph', () => {
    const someNode: AccountNode = {
      account: accounts.multisig1,
      children: [],
    };

    testGraph.set(accounts.multisig1, someNode);

    // Search for an account that's not in the graph
    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should handle deep nesting with single children', () => {
    // Create: Root -> Level1 -> Level2 -> Level3 -> Target
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const level3Node: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode],
    };

    const level2Node: AccountNode = {
      account: accounts.multisig2,
      children: [level3Node],
    };

    const level1Node: AccountNode = {
      account: accounts.proxy1,
      children: [level2Node],
    };

    const rootNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [level1Node],
    };

    testGraph.set(accounts.emptyWallet, rootNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // All parents in the single-child path should be included
    expect(result).toContain(accounts.emptyWallet);
    expect(result).toContain(accounts.proxy1);
    expect(result).toContain(accounts.multisig2);
    expect(result).toContain(accounts.multisig1);
    expect(result).toHaveLength(4);
  });

  it('should use exit visitor to clean up result set correctly', () => {
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode],
    };

    // Add another tree that doesn't contain the target
    const otherLeafNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const otherParentNode: AccountNode = {
      account: accounts.multisig2,
      children: [otherLeafNode],
    };

    testGraph.set(accounts.multisig1, parentNode);
    testGraph.set(accounts.multisig2, otherParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Should only contain the parent from the path that leads to target
    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
    expect(result).toHaveLength(1);
  });

  it('should not include unrelated single-child parents', () => {
    // Tree 1: Contains our target
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const relatedParentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode],
    };

    // Tree 2: Completely unrelated tree with single child
    const unrelatedChildNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const unrelatedParentNode: AccountNode = {
      account: accounts.multisig2,
      children: [unrelatedChildNode],
    };

    testGraph.set(accounts.multisig1, relatedParentNode);
    testGraph.set(accounts.multisig2, unrelatedParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
    expect(result).toHaveLength(1);
  });

  it('should handle complex hierarchy correctly', () => {
    // Create: GrandParent -> Parent -> Target
    const targetNode: AccountNode = {
      account: accounts.walletConnect,
      children: [],
    };

    const parentNode: AccountNode = {
      account: accounts.multisig1,
      children: [targetNode],
    };

    const grandParentNode: AccountNode = {
      account: accounts.proxy1,
      children: [parentNode],
    };

    // Add unrelated tree
    const unrelatedNode: AccountNode = {
      account: accounts.emptyWallet,
      children: [],
    };

    const unrelatedParentNode: AccountNode = {
      account: accounts.multisig2,
      children: [unrelatedNode],
    };

    testGraph.set(accounts.proxy1, grandParentNode);
    testGraph.set(accounts.multisig2, unrelatedParentNode);
    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Should only include parents from the path to target
    expect(result).toContain(accounts.proxy1);
    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
    expect(result).toHaveLength(2);
  });
});
