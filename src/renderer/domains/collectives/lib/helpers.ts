import { type ChainId } from '@/shared/core';

import { type CollectivePalletsType, type Store } from './types';

export const updateStore = (
  store: Partial<Store<any>>,
  params: { palletType: CollectivePalletsType; chainId: ChainId },
  updatedField: Record<string, unknown>,
) => {
  const { palletType, chainId } = params;
  const currentStore = store?.[palletType]?.[chainId] || {};

  const data = {
    ...store[palletType],
    [chainId]: {
      ...currentStore,
      ...updatedField,
    },
  };

  return { ...store, ...{ [palletType]: data } };
};
