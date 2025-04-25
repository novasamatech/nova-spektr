import { type ApiPromise } from '@polkadot/api';

import { type Chain, type HexString, type Transaction, TransactionType } from '@/shared/core';
import { collectiveCorePallet } from '@/shared/pallet/collectiveCore';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../_lib/types';
import { type Evidence } from '../evidence/types';
import { type Member } from '../member/types';

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
  accountId: AccountId;
  chain: Chain;
  proposal: HexString;
  originName: string;
  poll: ReferendumId;
  aye: boolean;
};

function createEvidenceVotingTransaction({
  accountId,
  chain,
  originName,
  poll,
  aye,
  pallet,
  proposal,
}: VoteEvidenceTransactionParams): EvidenceVotingTransaction {
  return {
    accountId: accountId,
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_EVIDENCE_VOTE,
    args: {
      after: 0,
      track: originName,
      pallet,
      proposal,
      poll,
      aye,
    },
  };
}

function isEvidenceVotingTransaction(transaction: Transaction): transaction is EvidenceVotingTransaction {
  return transaction.type === TransactionType.COLLECTIVE_EVIDENCE_VOTE;
}

function createProposal(palletType: CollectivePalletsType, evidence: Evidence, member: Member, api: ApiPromise) {
  if (evidence.wish === 'Promotion') {
    return collectiveCorePallet.extrinsic.promote(palletType, api, member.accountId, member.rank + 1).method.toHex();
  }
  if (evidence.wish === 'Retention') {
    return collectiveCorePallet.extrinsic.approve(palletType, api, member.accountId, member.rank).method.toHex();
  }
  return null;
}

export const votingService = {
  createVoteTransaction,
  isVotingTransaction,

  createEvidenceVotingTransaction,
  isEvidenceVotingTransaction,

  createProposal,
};
