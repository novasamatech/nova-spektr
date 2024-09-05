import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const convictionVotingPallet = {
  consts,
  storage,
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
