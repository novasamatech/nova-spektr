import { type Account, type Chain, TransactionType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { type CollectivePalletsType } from '../../lib/types';

import { type VotingTransaction } from './types';

type VoteTransactionParams = {
  pallet: CollectivePalletsType;
  account: Account;
  chain: Chain;
  referendumId: ReferendumId;
  aye: boolean;
};

const createVoteTransaction = ({
  pallet,
  account,
  chain,
  aye,
  referendumId,
}: VoteTransactionParams): VotingTransaction => {
  return {
    address: toAddress(account.accountId, { prefix: chain.addressPrefix }),
    chainId: chain.chainId,
    type: pallet === 'fellowship' ? TransactionType.FELLOWSHIP_VOTE : TransactionType.AMBASSADOR_VOTE,
    args: {
      poll: referendumId.toString(),
      aye,
    },
  };
};

export const votingService = {
  createVoteTransaction,
};
