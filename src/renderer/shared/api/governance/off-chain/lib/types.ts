import { Address, Chain, ReferendumId } from '@shared/core';

export type ReferendumVote = {
  decision: 'aye' | 'nay' | 'abstain';
  voter: Address;
};

export interface GovernanceApi {
  getReferendumList: (chain: Chain, callback: (data: Record<string, string>, done: boolean) => void) => void;
  getReferendumDetails: (chain: Chain, referendumId: ReferendumId) => Promise<string | undefined>;
  getReferendumVotes: (
    chain: Chain,
    referendumId: ReferendumId,
    callback: (data: ReferendumVote[], done: boolean) => void,
  ) => Promise<ReferendumVote[]>;
}
