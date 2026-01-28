import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountNode, type AnyAccount, accountService } from '@/domains/network';

import { type RequestedAccount, type SubscriptionKey } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  getRequestedAccounts,
  getSubscriptionKey,
};

function getSiblingAccounts(
  selectedAccounts: AnyAccount[],
  accounts: AnyAccount[],
  chains: Chain[],
): RequestedAccount[] {
  const siblings = new Map<SubscriptionKey, RequestedAccount>();
  const graphs = new Map<Chain, Map<string, AccountNode>>();

  for (const chain of chains) {
    for (const selected of selectedAccounts) {
      if (!accountService.isAccountAvailableOnChain(selected, chain)) continue;

      let graph = graphs.get(chain);
      if (!graph) {
        graph = accountService.createAccountGraphs(accounts, chain);
        graphs.set(chain, graph);
      }

      const node = accountService.findNodeByAccount(graph, selected);
      if (node) {
        accountService.traverseGraph(node, {
          enter(node) {
            for (const chain of chains) {
              if (accountService.isAccountAvailableOnChain(node.account, chain)) {
                const key = getSubscriptionKey(node.account.accountId, chain.chainId);
                siblings.set(key, { accountId: node.account.accountId, chain });
              }
            }
          },
        });
      }
    }
  }

  return Array.from(siblings.values());
}

function getRequestedAccounts(accounts: AnyAccount[], chains: Chain[]): RequestedAccount[] {
  const siblings = new Map<SubscriptionKey, RequestedAccount>();

  for (const chain of chains) {
    for (const account of accounts) {
      if (!accountService.isAccountAvailableOnChain(account, chain)) continue;

      const key = getSubscriptionKey(account.accountId, chain.chainId);
      siblings.set(key, { accountId: account.accountId, chain });
    }
  }

  return Array.from(siblings.values());
}

function getSubscriptionKey(account: AccountId, chain: ChainId): SubscriptionKey {
  return `${account} ${chain}`;
}
