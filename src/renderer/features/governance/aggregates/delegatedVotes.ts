import { combine, sample } from 'effector';
import uniq from 'lodash/uniq';

import { nonNullable, toAddress } from '@/shared/lib/utils';
import { referendumModel } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { delegatedVotesModel } from '../model/delegatedVotes';
import { networkSelectorModel } from '../model/networkSelector';

import { proposerIdentityAggregate } from './proposerIdentity';

const $delegatedVotesInChain = combine(
  delegatedVotesModel.$delegatedVotes,
  networkSelectorModel.$governanceChain,
  (votes, chain) => {
    if (!chain) return {};

    return votes[chain.chainId] ?? {};
  },
);

sample({
  clock: [
    referendumModel.events.referendumsReceived,
    networkSelectorModel.$governanceChainApi,
    walletModel.$activeWallet,
  ],
  source: {
    wallet: walletModel.$activeWallet,
    chain: networkSelectorModel.$governanceChain,
  },
  filter: ({ wallet, chain }) => nonNullable(wallet) && nonNullable(chain),
  fn: ({ wallet, chain }) => {
    return {
      addresses: wallet!.accounts.map((acc) => toAddress(acc.accountId, { prefix: chain?.addressPrefix })),
      chain: chain!,
    };
  },
  target: delegatedVotesModel.events.requestDelegatedVotes,
});

sample({
  clock: delegatedVotesModel.events.requestDelegatedVotesDone,
  fn: ({ result }) => ({
    addresses: uniq(Object.values(result)),
  }),
  target: proposerIdentityAggregate.events.requestProposers,
});

export const delegatedVotesAggregate = {
  $delegatedVotes: delegatedVotesModel.$delegatedVotes,
  $delegatedVotesInChain,
};
