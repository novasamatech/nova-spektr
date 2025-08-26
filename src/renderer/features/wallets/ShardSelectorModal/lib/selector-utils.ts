import { keys } from '@/shared/lib/utils';

import {
  type AccountToggleParams,
  type ChainToggleParams,
  type CheckedCounter,
  type RootToggleParams,
  type SelectedStruct,
  type ShardToggleParams,
  type ShardedToggleParams,
} from './types';

export const selectorUtils = {
  getSelectedAll,
  getSelectedRoot,
  getSelectedChain,
  getSelectedSharded,
  getSelectedShard,
  getSelectedAccount,
  isChecked,
  isSemiChecked,
};

function getSelectedAll(struct: SelectedStruct, value: boolean): SelectedStruct {
  return keys(struct).reduce<SelectedStruct>((acc, root) => getSelectedRoot(acc, { root, value }), struct);
}

function getSelectedRoot(struct: SelectedStruct, { root, value }: RootToggleParams): SelectedStruct {
  const { checked: _checked, total, ...chainsMap } = struct[root];
  struct[root].checked = value ? total : 0;

  for (const chains of Object.values(chainsMap)) {
    const { accounts, sharded } = chains;
    chains.checked = value ? chains.total : 0;

    for (const accountId of keys(accounts)) {
      accounts[accountId] = value;
    }

    for (const group of Object.values(sharded)) {
      const { total, checked: _checked, ...rest } = group;
      group.checked = value ? total : 0;

      for (const accountId of keys(rest)) {
        group[accountId] = value;
      }
    }
  }

  return { ...struct };
}

function getSelectedChain(struct: SelectedStruct, { root, chainId, value }: ChainToggleParams): SelectedStruct {
  const chain = struct[root][chainId];
  for (const accountId of keys(chain.accounts)) {
    chain.accounts[accountId] = value;
  }

  for (const group of Object.values(chain.sharded)) {
    const { total, checked: _checked, ...rest } = group;
    group.checked = value ? total : 0;

    for (const accountId of keys(rest)) {
      group[accountId] = value;
    }
  }

  struct[root].checked += value ? chain.total - chain.checked : -1 * chain.checked;
  chain.checked = value ? chain.total : 0;

  return { ...struct };
}

function getSelectedSharded(
  struct: SelectedStruct,
  { root, chainId, groupId, value }: ShardedToggleParams,
): SelectedStruct {
  const shardedGroup = struct[root][chainId].sharded[groupId];

  const { total, checked, ...shards } = shardedGroup;
  for (const accountId of keys(shards)) {
    shardedGroup[accountId] = value;
  }

  const addition = value ? total - checked : -1 * checked;
  struct[root].checked += addition;
  struct[root][chainId].checked += addition;
  shardedGroup.checked = value ? total : 0;

  return { ...struct };
}

function getSelectedShard(
  struct: SelectedStruct,
  { root, chainId, groupId, accountId, value }: ShardToggleParams,
): SelectedStruct {
  const addition = value ? 1 : -1;
  const chain = struct[root][chainId];

  chain.sharded[groupId][accountId] = value;
  chain.sharded[groupId].checked += addition;
  chain.checked += addition;
  struct[root].checked += addition;

  return { ...struct };
}

function getSelectedAccount(
  struct: SelectedStruct,
  { root, chainId, accountId, value }: AccountToggleParams,
): SelectedStruct {
  struct[root][chainId].accounts[accountId] = value;
  struct[root][chainId].checked += value ? 1 : -1;
  struct[root].checked += value ? 1 : -1;

  return { ...struct };
}

function isChecked(counter: CheckedCounter): boolean {
  return counter.checked === counter.total;
}

function isSemiChecked(counter: CheckedCounter): boolean {
  return counter.checked > 0 && counter.checked !== counter.total;
}
