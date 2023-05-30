import { groupBy } from 'lodash';

import { AccountDS } from '@renderer/services/storage';
import {
  ChainsRecord,
  ChainWithAccounts,
  MultishardStructure,
  RootAccount,
  SelectableShards,
} from '@renderer/components/layout/PrimaryLayout/Wallets/common/types';
import { AccountId, ChainId } from '@renderer/domain/shared-kernel';
import { includes } from '@renderer/shared/utils/strings';

const getRootAccount = (accounts: AccountDS[], chains: ChainsRecord, root: AccountDS): RootAccount => {
  const accountsByChain = groupBy(
    accounts.filter((a) => a.rootId === root.id),
    ({ chainId }) => chainId,
  );
  const chainAccounts: ChainWithAccounts[] = Object.entries(accountsByChain).map(([chainId, accounts]) => ({
    ...chains[chainId as ChainId],
    accounts,
  }));

  return {
    ...root,
    chains: chainAccounts,
    amount: chainAccounts.reduce((acc, chain) => acc + chain.accounts.length, 1), // start with 1 because we want to count root acc as well
  };
};

export const getMultishardStructure = (
  accounts: AccountDS[],
  chains: ChainsRecord,
  walletId: string,
): MultishardStructure => {
  const walletAccounts = accounts.filter((a) => a.walletId === walletId);
  const rootAccounts = walletAccounts
    .filter((a) => !a.rootId)
    .map((root) => getRootAccount(walletAccounts, chains, root));

  return {
    amount: rootAccounts.reduce((acc, rootAccount) => acc + rootAccount.amount, 0),
    rootAccounts,
  };
};

export const getSelectableShards = (multishard: MultishardStructure, selectedIds: AccountId[]): SelectableShards => {
  return {
    ...multishard,
    rootAccounts: multishard.rootAccounts.map((r) => {
      const chains = r.chains.map((c) => {
        const accounts = c.accounts.map((a) => ({ ...a, isSelected: selectedIds.includes(a.accountId) }));
        const selectedAccounts = accounts.filter((a) => a.isSelected);

        return {
          ...c,
          accounts: accounts,
          isSelected: selectedAccounts.length === accounts.length,
          selectedAmount: selectedAccounts.length,
        };
      });

      return {
        ...r,
        isSelected: selectedIds.includes(r.accountId),
        chains: chains,
        selectedAmount: chains.filter((c) => c.isSelected).length,
      };
    }),
  };
};

export const searchShards = (shards: SelectableShards, query: string): SelectableShards => {
  const rootAccounts = shards.rootAccounts.map((r) => {
    const chains = r.chains.map((c) => ({
      ...c,
      accounts: c.accounts.filter((a) => includes(a.name, query) || includes(a.accountId, query)),
    }));

    return {
      ...r,
      chains: chains.filter((c) => c.accounts.length),
    };
  });

  return {
    ...shards,
    rootAccounts: rootAccounts.filter(
      (r) => includes(r.accountId, query) || includes(r.name, query) || r.chains.length,
    ),
  };
};
