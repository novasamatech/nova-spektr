import { ChainId } from '@shared/core';
import { IGovernanceApi } from '../lib/types';

export const polkassemblyService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

async function getReferendumList(chainId: ChainId): Promise<any[]> {
  console.log('API polkassemblyService - getReferendumList');

  return Promise.resolve([]);
}

async function getReferendumDetails(chainId: ChainId, index: number): Promise<any> {
  console.log('API polkassemblyService - getReferendumDetails');

  return Promise.resolve();
}
