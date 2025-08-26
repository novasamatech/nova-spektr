import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountNode, type AnyAccount, accountService } from '@/domains/network';

import { type SubscriptionKey } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  getSubscriptionKey,
};

function getSiblingAccounts(selectedAccounts: AnyAccount[], accounts: AnyAccount[], chains: Chain[]) {
  const chainSiblings = new Map<SubscriptionKey, AnyAccount>();
  const universalSiblings = new Set<AnyAccount>();
  const graphs = new Map<Chain, Map<AnyAccount, AccountNode>>();

  for (const chain of chains) {
    for (const selected of selectedAccounts) {
      if (!accountService.isAccountAvailableOnChain(selected, chain)) continue;

      let graph = graphs.get(chain);
      if (!graph) {
        graph = accountService.createAccountGraphs(accounts, chain);
        graphs.set(chain, graph);
      }

      const node = graph.get(selected);
      if (node) {
        accountService.traverseGraph(node, {
          enter(node) {
            if (accountService.isUniversalAccount(node.account)) {
              universalSiblings.add(node.account);
            } else {
              const key = getSubscriptionKey(node.account.accountId, node.account.chainId);
              chainSiblings.set(key, node.account);
            }
          },
        });
      }
    }
  }

  return Array.from(chainSiblings.values()).concat(Array.from(universalSiblings));
}

function getSubscriptionKey(account: AccountId, chain: ChainId): SubscriptionKey {
  return `${account} ${chain}`;
}
