import { consts } from './consts';
import * as schema from './schema';
import { state } from './state';

export const convictionVotingPallet = {
  consts,
  state,
  schema,
};

export type {
  ConvictionVotingConviction,
  ConvictionVotingDelegations,
  ConvictionVotingTally,
  ConvictionVotingVote,
  ConvictionVotingVoteAccountVote,
  ConvictionVotingVoteCasting,
  ConvictionVotingVoteDelegating,
  ConvictionVotingVotePriorLock,
  ConvictionVotingVoteVoting,
  ConvictionVotingClassLock,
} from './schema';
