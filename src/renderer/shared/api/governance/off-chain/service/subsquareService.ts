import { ChainId } from '../../../../core';
import { IGovernanceApi } from '../lib/types';

export const subsquareService: IGovernanceApi = {
  getReferendumList,
  getReferendumDetails,
};

async function getReferendumList(chainId: ChainId): Promise<any[]> {
  console.log('API subsquareService - getReferendumList');

  return Promise.resolve([]);
}

async function getReferendumDetails(chainId: ChainId, index: number): Promise<any> {
  console.log('API subsquareService - getReferendumDetails');

  return Promise.resolve();
}
