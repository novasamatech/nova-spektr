import { BN, BN_ZERO } from '@polkadot/util';

import { type Conviction, type Transaction, TransactionType } from '@shared/core';
import { toSerializable } from '@shared/lib/utils';
import {
  type RemoveVoteTransaction,
  type TransactionSplitAbstainVote,
  type TransactionStandardVote,
  type TransactionVote,
  type VoteTransaction,
} from '../types/voteTransaction';

import { votingService } from './votingService';

const isStandardVote = (vote: TransactionVote): vote is TransactionStandardVote => {
  return 'Standard' in vote;
};

const isSplitAbstainVote = (vote: TransactionVote): vote is TransactionSplitAbstainVote => {
  return 'Standard' in vote;
};

const isVoteTransaction = (t: Transaction): t is VoteTransaction => {
  return t.type === TransactionType.VOTE;
};

const isRemoveVoteTransaction = (t: Transaction): t is RemoveVoteTransaction => {
  return t.type === TransactionType.REMOVE_VOTE;
};

const createTransactionVote = (
  decision: 'aye' | 'nay' | 'abstain',
  amount: BN,
  conviction: Conviction,
): TransactionVote => {
  if (decision === 'abstain') {
    return toSerializable({
      SplitAbstain: {
        type: 'SplitAbstain',
        abstain: amount,
        aye: BN_ZERO,
        nay: BN_ZERO,
      },
    });
  }

  return toSerializable({
    Standard: {
      type: 'Standard',
      balance: amount,
      vote: {
        conviction: conviction,
        aye: decision === 'aye',
      },
    },
  });
};

const getVoteAmount = (vote: TransactionVote) =>
  new BN(isStandardVote(vote) ? vote.Standard.balance : vote.SplitAbstain.abstain);

const getDecision = (vote: TransactionVote): 'aye' | 'nay' | 'abstain' => {
  if (isStandardVote(vote)) {
    return vote.Standard.vote.vote === 'Aye' || vote.Standard.vote.aye ? 'aye' : 'nay';
  } else {
    return 'abstain';
  }
};

const getVotes = (vote: TransactionVote): BN => {
  if (voteTransactionService.isStandardVote(vote)) {
    return new BN(vote.Standard.balance.replaceAll(',', '')).mul(
      new BN(votingService.getConvictionMultiplier(vote.Standard.vote.conviction)),
    );
  }

  return new BN(vote.SplitAbstain.abstain);
};

export const voteTransactionService = {
  getVoteAmount,
  getDecision,
  getVotes,

  isVoteTransaction,
  isRemoveVoteTransaction,
  isStandardVote,
  isSplitAbstainVote,
  createTransactionVote,
};
