import { ChainId } from '@shared/core';

export interface IGovernanceApi {
  getReferendumList: (chainId: ChainId) => void;
  getReferendumDetails: (chainId: ChainId, index: number) => void;
}
