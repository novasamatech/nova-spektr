import { Chain } from '@shared/core';

export interface IGovernanceApi {
  getReferendumList: (chain: Chain, callback: (data: Record<string, string>, done: boolean) => void) => void;
  getReferendumDetails: (chain: Chain, index: string) => Promise<string | undefined>;
}
