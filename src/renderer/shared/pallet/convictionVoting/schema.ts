import { GenericVote } from '@polkadot/types/generic/Vote';
import { type z } from 'zod';

import { pjsSchema } from '@/shared/polkadotjs-schemas';

export type ConvictionVotingConviction = z.infer<typeof convictionVotingConviction>;
export const convictionVotingConviction = pjsSchema.enumType(
  'None',
  'Locked1x',
  'Locked2x',
  'Locked3x',
  'Locked4x',
  'Locked5x',
  'Locked6x',
);

export type ConvictionVotingVotePriorLock = z.infer<typeof convictionVotingVotePriorLock>;
export const convictionVotingVotePriorLock = pjsSchema.tuppleMap(
  ['unlockAt', pjsSchema.u32],
  ['amount', pjsSchema.u128],
);

export type ConvictionVotingVote = z.infer<typeof convictionVotingVote>;
export const convictionVotingVote = pjsSchema.complex(GenericVote, vote => ({
  isAye: vote.isAye,
  isNay: vote.isNay,
  conviction: vote.conviction,
}));

export type ConvictionVotingVoteAccountVote = z.infer<typeof convictionVotingVoteAccountVote>;
export const convictionVotingVoteAccountVote = pjsSchema.enumValue({
  Standard: pjsSchema.object({
    balance: pjsSchema.u128,
    vote: convictionVotingVote,
  }),
  Split: pjsSchema.object({
    aye: pjsSchema.u128,
    nay: pjsSchema.u128,
  }),
  SplitAbstain: pjsSchema.object({
    aye: pjsSchema.u128,
    nay: pjsSchema.u128,
    abstain: pjsSchema.u128,
  }),
});

export type ConvictionVotingDelegations = z.infer<typeof convictionVotingDelegations>;
export const convictionVotingDelegations = pjsSchema.object({
  votes: pjsSchema.u128,
  capital: pjsSchema.u128,
});

export type ConvictionVotingVoteCasting = z.infer<typeof convictionVotingVoteCasting>;
export const convictionVotingVoteCasting = pjsSchema.object({
  votes: pjsSchema.vec(pjsSchema.tuppleMap(['referendum', pjsSchema.u32], ['vote', convictionVotingVoteAccountVote])),
  delegations: convictionVotingDelegations,
  prior: convictionVotingVotePriorLock,
});

export type ConvictionVotingVoteDelegating = z.infer<typeof convictionVotingVoteDelegating>;
const convictionVotingVoteDelegating = pjsSchema.object({
  balance: pjsSchema.u128,
  target: pjsSchema.accountId,
  conviction: convictionVotingConviction,
  delegations: convictionVotingDelegations,
  prior: convictionVotingVotePriorLock,
});

export type ConvictionVotingVoteVoting = z.infer<typeof convictionVotingVoteVoting>;
export const convictionVotingVoteVoting = pjsSchema.enumValue({
  Casting: convictionVotingVoteCasting,
  Delegating: convictionVotingVoteDelegating,
});

export type ConvictionVotingClassLock = z.infer<typeof convictionVotingClassLock>;
export const convictionVotingClassLock = pjsSchema.tuppleMap(['track', pjsSchema.u16], ['amount', pjsSchema.u128]);

export type ConvictionVotingTally = z.infer<typeof convictionVotingTally>;
export const convictionVotingTally = pjsSchema.object({
  ayes: pjsSchema.u128,
  nays: pjsSchema.u128,
  support: pjsSchema.u128,
});
