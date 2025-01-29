import { BN, BN_ZERO } from '@polkadot/util';

import { type Conviction, type Transaction, TransactionType } from '@/shared/core';
import { toSerializable } from '@/shared/lib/utils';
import {
  type TransactionSplitAbstainVote,
  type TransactionStandardVote,
  type TransactionVote,
} from '../types/voteTransaction';

import { votingService } from './votingService';

const isStandardVote = (vote: TransactionVote): vote is TransactionStandardVote => {
  return 'Standard' in vote;
};

const isSplitAbstainVote = (vote: TransactionVote): vote is TransactionSplitAbstainVote => {
  return 'Standard' in vote;
};

const isVoteTransaction = (t: Transaction): boolean => {
  return t.type === TransactionType.VOTE || (t.args?.transaction && isVoteTransaction(t.args?.transaction));
};

const isRevoteTransaction = (t: Transaction): boolean => {
  return t.type === TransactionType.REVOTE || (t.args?.transaction && isRevoteTransaction(t.args.transaction));
};

const isRemoveVoteTransaction = (t: Transaction): boolean => {
  if (t.type === TransactionType.BATCH_ALL) {
    return t.args.transactions?.some(isRemoveVoteTransaction);
  }

  return t.type === TransactionType.REMOVE_VOTE || (t.args?.transaction && isRemoveVoteTransaction(t.args.transaction));
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
  getDecision,
  getVotes,

  isVoteTransaction,
  isRevoteTransaction,
  isRemoveVoteTransaction,
  isStandardVote,
  isSplitAbstainVote,
  createTransactionVote,
};
