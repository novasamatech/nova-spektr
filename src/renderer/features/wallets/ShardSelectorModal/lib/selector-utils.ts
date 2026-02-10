import { keys } from '@/shared/lib/utils';

import {
  type AccountToggleParams,
  type ChainToggleParams,
  type CheckedCounter,
  type RootToggleParams,
  type SelectedStruct,
} from './types';

export const selectorUtils = {
  getSelectedAll,
  getSelectedRoot,
  getSelectedChain,
  getSelectedAccount,
  isChecked,
  isSemiChecked,
};

function getSelectedAll(struct: SelectedStruct, value: boolean): SelectedStruct {
  return keys(struct).reduce<SelectedStruct>((acc, root) => getSelectedRoot(acc, { root, value }), struct);
}

function getSelectedRoot(struct: SelectedStruct, { root, value }: RootToggleParams): SelectedStruct {
  const { checked: _checked, total, ...chainsMap } = struct[root]!;
  struct[root]!.checked = value ? total : 0;

  for (const chains of Object.values(chainsMap)) {
    const { accounts } = chains;
    chains.checked = value ? chains.total : 0;

    for (const accountId of keys(accounts)) {
      accounts[accountId] = value;
    }
  }

  return { ...struct };
}

function getSelectedChain(struct: SelectedStruct, { root, chainId, value }: ChainToggleParams): SelectedStruct {
  const chain = struct[root]![chainId]!;
  for (const accountId of keys(chain.accounts)) {
    chain.accounts[accountId] = value;
  }

  struct[root]!.checked += value ? chain.total - chain.checked : -1 * chain.checked;
  chain.checked = value ? chain.total : 0;

  return { ...struct };
}

function getSelectedAccount(
  struct: SelectedStruct,
  { root, chainId, accountId, value }: AccountToggleParams,
): SelectedStruct {
  struct[root]![chainId]!.accounts[accountId] = value;
  struct[root]![chainId]!.checked += value ? 1 : -1;
  struct[root]!.checked += value ? 1 : -1;

  return { ...struct };
}

function isChecked(counter: CheckedCounter): boolean {
  return counter.checked === counter.total;
}

function isSemiChecked(counter: CheckedCounter): boolean {
  return counter.checked > 0 && counter.checked !== counter.total;
}
