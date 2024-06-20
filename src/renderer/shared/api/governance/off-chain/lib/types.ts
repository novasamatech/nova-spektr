import { ChainId } from '@shared/core';

export interface IGovernanceApi {
  getReferendumList: (chainId: ChainId, callback: (data: Record<string, string>) => void) => void;
  getReferendumDetails: (chainId: ChainId, index: string) => Promise<string | undefined>;
}
