import { type Chain, CryptoType } from '@/shared/core';
import { createAnyOf, createPipeline } from '@/shared/di';
import { nullable } from '@/shared/lib/utils';
import { networkUtils } from '@/entities/network';

import {
  type AccountNode,
  type AnyAccount,
  type AnyAccountDraft,
  type ChainAccount,
  type UniversalAccount,
} from './types';

const accountAvailabilityOnChainAnyOf = createAnyOf<{ account: UniversalAccount; chain: Chain }>();
const accountActionPermissionAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountCanSignMultipleAnyOf = createAnyOf<{ account: AnyAccount }>();
const accountGraphCollectPipeline = createPipeline<AccountNode<AnyAccount>, { accounts: AnyAccount[] }>();

/**
 * ATTENTION! This method is the source of stable id for different types of
 * account. If you want to change implementation you should also write db
 * migrations and make regress testing across application to verify that new
 * account id has no collisions.
 */
function uniqId(account: AnyAccountDraft) {
  if (isUniversalAccount(account)) {
    return `${account.walletId} ${account.accountId} universal`;
  }
  if (isChainAccount(account)) {
    return `${account.walletId} ${account.accountId} ${account.chainId}`;
  }

  throw new Error('Unsupported account type.');
}

function isCryptoMatch(account: Pick<AnyAccount, 'cryptoType'>, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return account.cryptoType === cryptoType;
}

function isChainAccount(account: Pick<AnyAccount, 'type'>): account is ChainAccount {
  return account.type === 'chain';
}

function isUniversalAccount(account: Pick<AnyAccount, 'type'>): account is UniversalAccount {
  return account.type === 'universal';
}

function isAccountAvailableOnChain(account: Pick<AnyAccount, 'type' | 'cryptoType'>, chain: Chain) {
  if (!isCryptoMatch(account, chain)) {
    return false;
  }

  if (isChainAccount(account)) {
    return account.chainId === chain.chainId;
  }

  if (isUniversalAccount(account)) {
    return accountAvailabilityOnChainAnyOf.check({ account, chain });
  }
}

function filterAccountOnChain(accounts: AnyAccount[], chain: Chain) {
  return accounts.filter(account => isAccountAvailableOnChain(account, chain));
}

function filterAccountsByWallet(accounts: AnyAccount[], walletId: number) {
  return accounts.filter(account => account.walletId === walletId);
}

function hasPermissionToMakeActions(account: AnyAccount) {
  return accountActionPermissionAnyOf.check({ account });
}

function canSignMultipleTransactions(account: AnyAccount) {
  return accountCanSignMultipleAnyOf.check({ account });
}

/**
 * DFS traverse. Return false in enter visitor to stop traversing.
 */
function traverseGraph(
  node: AccountNode<AnyAccount>,
  visitor: {
    enter: (node: AccountNode<AnyAccount>) => false | void;
    exit?: (node: AccountNode<AnyAccount>) => void;
  },
): false | undefined {
  const result = visitor.enter(node);

  if (result === false) return false;

  for (const child of node.children) {
    const continueTraverse = traverseGraph(child, visitor);
    if (continueTraverse === false) return false;
  }

  visitor.exit?.(node);
}

function createAccountGraphs(accounts: AnyAccount[], chain: Chain): Map<AnyAccount, AccountNode<AnyAccount>> {
  const chainAccounts = accounts.filter(account => isAccountAvailableOnChain(account, chain));
  const nodes = new Map<AnyAccount, AccountNode<AnyAccount>>();

  for (const account of chainAccounts) {
    const initialNode: AccountNode<AnyAccount> = {
      type: 'account',
      account,
      children: [],
    };
    const accountNode = accountGraphCollectPipeline(initialNode, { accounts });

    traverseGraph(accountNode, {
      enter(accountChildNode) {
        for (const [index, child] of accountChildNode.children.entries()) {
          const existing = nodes.get(child.account);
          if (existing) {
            accountChildNode.children.splice(index, 1, existing);
          }
        }

        nodes.set(accountChildNode.account, accountChildNode);
      },
    });
  }

  return nodes;
}

function findSignatories(account: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const graphs = createAccountGraphs(accounts, chain);
  const node = graphs.get(account);
  if (nullable(node)) {
    return [];
  }

  const result: AnyAccount[] = [];

  traverseGraph(node, {
    enter(node) {
      if (node.children.length === 0) {
        result.push(node.account);
      }
    },
  });

  return result;
}

function findRoute(source: AnyAccount, destination: AnyAccount, accounts: AnyAccount[], chain: Chain): AnyAccount[] {
  const stack: AnyAccount[] = [];
  const graphs = createAccountGraphs(accounts, chain);
  const entryNode = graphs.get(source);

  if (nullable(entryNode)) {
    return [];
  }

  traverseGraph(entryNode, {
    enter(node) {
      stack.push(node.account);
      if (node.account === destination) {
        return false;
      }
    },
    exit() {
      stack.pop();
    },
  });

  return stack;
}

export const accountService = {
  accountAvailabilityOnChainAnyOf,
  accountActionPermissionAnyOf,
  accountCanSignMultipleAnyOf,
  accountGraphCollectPipeline,

  uniqId,

  isChainAccount,
  isUniversalAccount,
  isAccountAvailableOnChain,

  canSignMultipleTransactions,

  hasPermissionToMakeActions,

  filterAccountOnChain,
  filterAccountsByWallet,

  // graph

  createAccountGraphs,
  findSignatories,
  findRoute,
};
