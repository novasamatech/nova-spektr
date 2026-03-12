import { type AccountNode, type AnyAccount } from '@/domains/network';
import { forgetService } from '../service';

import { accounts } from './mocks';

function mkNode(account: AnyAccount, children: AccountNode[] = []): AccountNode {
  return { account, children };
}

describe('forgetService.findParentAccounts', () => {
  let testGraph: Map<AnyAccount, AccountNode>;
  beforeEach(() => {
    testGraph = new Map();
  });

  it('should return empty array when account has no parents', () => {
    // Create a simple graph with just one account (no parents)
    const n = mkNode(accounts.walletConnect);
    testGraph.set(accounts.walletConnect, n);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should find parent when there is a single-child path to target account', () => {
    // Create: Parent -> Child (target)
    const childNode = mkNode(accounts.walletConnect);
    const parentNode = mkNode(accounts.multisig1, [childNode]);

    testGraph.set(accounts.multisig1, parentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toContain(accounts.multisig1);
  });

  it('should not return parent when parent has multiple children', () => {
    // Create: Parent -> [Child1, Child2 (target)]
    const targetChild = mkNode(accounts.walletConnect);
    const otherChild = mkNode(accounts.emptyWallet);
    const parentNode = mkNode(accounts.multisig1, [targetChild, otherChild]);

    testGraph.set(accounts.multisig1, parentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should handle complex hierarchical structure', () => {
    // Create: GrandParent -> Parent -> Target
    const targetNode = mkNode(accounts.walletConnect);
    const parentNode = mkNode(accounts.multisig1, [targetNode]);
    const grandParentNode = mkNode(accounts.proxy1, [parentNode]);

    testGraph.set(accounts.proxy1, grandParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Both grandparent and parent should be in result since they each have only one child
    expect(result).toContain(accounts.proxy1);
    expect(result).toContain(accounts.multisig1);
  });

  it('should clear results when encountering parent with multiple children in the path', () => {
    // Create: GrandParent -> Parent (with multiple children) -> Target
    const targetNode = mkNode(accounts.walletConnect);
    const siblingNode = mkNode(accounts.emptyWallet);
    const parentNode = mkNode(accounts.multisig1, [targetNode, siblingNode]);
    const grandParentNode = mkNode(accounts.proxy1, [parentNode]);

    testGraph.set(accounts.proxy1, grandParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    expect(result).toEqual([]);
  });

  it('should handle multiple separate trees in the graph', () => {
    // Tree 1: Parent1 -> Target
    const targetInTree1 = mkNode(accounts.walletConnect);
    const parentInTree1 = mkNode(accounts.multisig1, [targetInTree1]);

    // Tree 2: Parent2 -> OtherAccount (not the target)
    const otherAccountNode = mkNode(accounts.emptyWallet);
    const parentInTree2 = mkNode(accounts.multisig2, [otherAccountNode]);

    testGraph.set(accounts.multisig1, parentInTree1);
    testGraph.set(accounts.multisig2, parentInTree2);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Should only find parent from the tree containing the target
    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
  });

  it('should return empty array when target account is not found in graph', () => {
    const someNode = mkNode(accounts.multisig1);

    testGraph.set(accounts.multisig1, someNode);

    // Search for an account that's not in the graph
    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);
    expect(result).toEqual([]);
  });

  it('should handle deep nesting with single children', () => {
    // Create: Root -> Level1 -> Level2 -> Level3 -> Target
    const targetNode = mkNode(accounts.walletConnect);
    const level3Node = mkNode(accounts.multisig1, [targetNode]);
    const level2Node = mkNode(accounts.multisig2, [level3Node]);
    const level1Node = mkNode(accounts.proxy1, [level2Node]);
    const rootNode = mkNode(accounts.emptyWallet, [level1Node]);

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
    const targetNode = mkNode(accounts.walletConnect);
    const parentNode = mkNode(accounts.multisig1, [targetNode]);

    // Add another tree that doesn't contain the target
    const otherLeafNode = mkNode(accounts.emptyWallet);
    const otherParentNode = mkNode(accounts.multisig2, [otherLeafNode]);

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
    const targetNode = mkNode(accounts.walletConnect);
    const relatedParentNode = mkNode(accounts.multisig1, [targetNode]);

    // Tree 2: Completely unrelated tree with single child
    const unrelatedChildNode = mkNode(accounts.emptyWallet);
    const unrelatedParentNode = mkNode(accounts.multisig2, [unrelatedChildNode]);

    testGraph.set(accounts.multisig1, relatedParentNode);
    testGraph.set(accounts.multisig2, unrelatedParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
    expect(result).toHaveLength(1);
  });

  it('should handle complex hierarchy correctly', () => {
    // Create: GrandParent -> Parent -> Target
    const targetNode = mkNode(accounts.walletConnect);
    const parentNode = mkNode(accounts.multisig1, [targetNode]);
    const grandParentNode = mkNode(accounts.proxy1, [parentNode]);

    // Add unrelated tree
    const unrelatedNode = mkNode(accounts.emptyWallet);
    const unrelatedParentNode = mkNode(accounts.multisig2, [unrelatedNode]);

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
