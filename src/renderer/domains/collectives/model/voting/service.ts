import { type Chain, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type AnyAccount } from '@/domains/network';
import { type CollectivePalletsType } from '../../lib/types';

import { type VotingTransaction } from './types';

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
    address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    type: TransactionType.COLLECTIVE_VOTE,
    args: {
      rank,
      pallet,
      poll: referendumId.toString(),
      aye,
    },
  };
};

export const votingService = {
  createVoteTransaction,
};
