import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type Track } from '../tracks/types';

import { type EvidenceVotingTransaction, type VotingTransaction } from './types';

type VoteTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
  rank: number;
  referendumId: ReferendumId;
  aye: boolean;
};

const createVoteTransaction = ({
  pallet,
  rank,
  account,
  chain,
  aye,
  referendumId,
}: VoteTransactionParams): VotingTransaction => {
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_VOTE,
    args: {
      rank,
      pallet,
      poll: referendumId,
      aye,
    },
  };
};

function isVotingTransaction(transaction: Transaction): transaction is VotingTransaction {
  return transaction.type === TransactionType.COLLECTIVE_VOTE;
}

type VoteEvidenceTransactionParams = {
  pallet: CollectivePalletsType;
  account: AnyAccount;
  chain: Chain;
  proposal: HexString;
  track: Track;
  referendumId: ReferendumId;
  aye: boolean;
};

function createEvidenceVotingTransaction({
  account,
  chain,
  track,
  referendumId,
  aye,
  pallet,
  proposal,
}: VoteEvidenceTransactionParams): EvidenceVotingTransaction {
  const at = track.decisionPeriod;
  return {
    accountId: account.accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_VOTE,
    args: {
      at,
      track: track.name,
      pallet,
      proposal,
      poll: referendumId,
      aye,
    },
  };
}

function isEvidenceVotingTransaction(transaction: Transaction): transaction is EvidenceVotingTransaction {
  return transaction.type === TransactionType.COLLECTIVE_EVIDENCE_VOTE;
}

export const votingService = {
  createVoteTransaction,
  isVotingTransaction,

  createEvidenceVotingTransaction,
  isEvidenceVotingTransaction,
};
