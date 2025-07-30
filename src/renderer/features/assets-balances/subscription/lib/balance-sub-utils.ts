import { type Chain, type ChainId } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AccountNode, type AnyAccount, accountService } from '@/domains/network';

import { type SubscriptionKey } from './types';

export const balanceSubUtils = {
  getSiblingAccounts,
  getSubscriptionKey,
};

function getSiblingAccounts(selectedAccounts: AnyAccount[], accounts: AnyAccount[], chains: Chain[]) {
  const siblings = new Map<AccountId, AnyAccount>();
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
            siblings.set(node.account.accountId, node.account);
          },
        });
      }
    }
  }

  return Array.from(siblings.values());
}

function getSubscriptionKey(account: AccountId, chain: ChainId): SubscriptionKey {
  return `${account} ${chain}`;
}
