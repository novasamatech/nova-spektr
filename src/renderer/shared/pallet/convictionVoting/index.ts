import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const convictionVotingPallet = {
  consts,
  state,
  schema,
};

export {
  type ConvictionVotingClassLock,
  type ConvictionVotingConviction,
  type ConvictionVotingDelegations,
  type ConvictionVotingTally,
  type ConvictionVotingVote,
  type ConvictionVotingVoteAccountVote,
  type ConvictionVotingVoteCasting,
  type ConvictionVotingVoteDelegating,
  type ConvictionVotingVotePriorLock,
  type ConvictionVotingVoteVoting,
} from './schema';
