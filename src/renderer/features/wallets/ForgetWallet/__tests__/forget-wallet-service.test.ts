import { AccountType, CryptoType, SigningType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountNode, type AnyAccount } from '@/domains/network';
import { forgetService } from '../service';

describe('forgetService.findParentAccounts', () => {
  let testGraph: Map<AnyAccount, AccountNode>;
  let accounts: { [key: string]: AnyAccount };

  beforeEach(() => {
    // Create test accounts based on your data
    accounts = {
      walletConnect: {
        id: '1 0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        accountId: '0x0e465ddeaa6f65e653574ee064105b0f541938cca2e3894b3fa45d95a33fca7f' as AccountId,
        name: 'm',
        signingType: SigningType.WALLET_CONNECT,
        type: 'chain',
        chainId: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        accountType: AccountType.WALLET_CONNECT,
        cryptoType: CryptoType.SR25519,
        walletId: 1,
      },
      multisig1: {
        id: '3 0x4cdf6e4b36739ee6e7f11d977ccb975946c7c0afccb6ba01352eef00d782e84c universal',
        accountId: '0x4cdf6e4b36739ee6e7f11d977ccb975946c7c0afccb6ba01352eef00d782e84c' as AccountId,
        name: '5DoVs...Es3ui',
        accountType: AccountType.MULTISIG,
        signingType: SigningType.MULTISIG,
        type: 'universal',
        walletId: 3,
      },
      multisig2: {
        id: '4 0xf9e94d71f4e3695e07e21b574e1ce2e56b228a020a34824884ed9987e6a4e4ad universal',
        accountId: '0xf9e94d71f4e3695e07e21b574e1ce2e56b228a020a34824884ed9987e6a4e4ad',
        name: '5HiP5...ur586',
        accountType: 'multisig',
        signingType: 'signing_ms',
        type: 'universal',
        walletId: 4,
      },
      proxy1: {
        id: '9 0x468cb8efc1544cd5000a14ad97e7750585f3378fe786046f11725c2acd5123a0 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        accountId: '0x468cb8efc1544cd5000a14ad97e7750585f3378fe786046f11725c2acd5123a0',
        name: 'Any for pure 5DfD1f...WQYVRb',
        accountType: 'proxied',
        signingType: 'signing_wo',
        type: 'chain',
        walletId: 9,
      },
      emptyWallet: {
        id: '8 0xe41def6480474253c2aa26e138da902771875ca8a979926e691a8bae41fcd218 0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        accountId: '0xe41def6480474253c2aa26e138da902771875ca8a979926e691a8bae41fcd218',
        name: 'empt',
        accountType: 'wallet_connect',
        signingType: 'signing_wc',
        type: 'chain',
        walletId: 8,
      },
    };

    // Create the graph structure
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
    // Where both GrandParent and Parent have only one child each
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
      children: [targetNode, siblingNode], // Multiple children
    };

    const grandParentNode: AccountNode = {
      account: accounts.proxy1,
      children: [parentNode],
    };

    testGraph.set(accounts.proxy1, grandParentNode);

    const result = forgetService.findParentAccounts(testGraph, accounts.walletConnect);

    // Should be empty because parent has multiple children
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
    // This test verifies that the exit visitor properly removes accounts
    // from the result set when backtracking

    // Create a structure where we traverse multiple paths
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

  it('should NOT include unrelated single-child parents (corrected version)', () => {
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

    // CORRECTED BEHAVIOR: Only includes parents from the actual path to target
    expect(result).toContain(accounts.multisig1);
    expect(result).not.toContain(accounts.multisig2);
    expect(result).toHaveLength(1);
  });

  it('should handle complex hierarchy correctly (corrected version)', () => {
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
