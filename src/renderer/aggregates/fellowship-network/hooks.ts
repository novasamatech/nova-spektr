import { useStoreMap, useUnit } from 'effector-react';

import { type AccountId } from '@/shared/polkadotjs-schemas';
import { salaryService, useSalaryCycleResource } from '@/domains/collectives';
import { useBlock, useIdentities, useIdentity } from '@/domains/network';

import { fellowshipNetwork } from './model';

export const useFellowshipNetwork = () => {
  return useUnit(fellowshipNetwork.$network);
};

export const useFellowshipApi = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.api ?? null);
};

export const useFellowshipChain = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.chain ?? null);
};

export const useFellowshipAsset = () => {
  return useStoreMap(fellowshipNetwork.$network, n => n?.asset ?? null);
};

export const useFellowshipBlock = () => {
  const api = useFellowshipApi();
  return useBlock(api);
};

export const useFellowshipChainConnected = () => {
  return useUnit(fellowshipNetwork.$isConnected);
};

export const useCurrentSalaryPeriod = () => {
  const api = useFellowshipApi();
  const { data: block, pending: blockPending } = useFellowshipBlock();
  const { data: cycle, pending: cyclePending } = useSalaryCycleResource({ palletType: 'fellowship', api });

  return {
    data: cycle && block ? salaryService.getCurrentPeriod(cycle, block) : null,
    pending: blockPending || cyclePending,
  };
};

export const useFellowshipIdentities = (accounts: AccountId[]) => {
  const chain = useFellowshipChain();
  return useIdentities(accounts, chain?.chainId);
};

export const useFellowshipIdentity = (account?: AccountId | null) => {
  const chain = useFellowshipChain();
  return useIdentity(account, chain?.chainId);
};
