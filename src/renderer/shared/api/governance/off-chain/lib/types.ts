import { ChainId } from '@shared/core';

export interface IGovernanceApi {
  getReferendumList: (chainId: ChainId) => Promise<Record<string, string>>;
  getReferendumDetails: (chainId: ChainId, index: string) => Promise<string | undefined>;
}
