import { ChainId } from '@shared/core';

export interface IGovernanceApi {
  getReferendumList: (chainId: ChainId) => Promise<unknown[]>;
  getReferendumDetails: (chainId: ChainId, index: number) => Promise<unknown | undefined>;
}
