import { combine, sample } from 'effector';
import uniq from 'lodash/uniq';

import { nonNullable, toAddress } from '@/shared/lib/utils';
import { referendumModel } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { delegatedVotesModel } from '../model/delegatedVotes';
import { networkSelectorModel } from '../model/networkSelector';

import { proposerIdentityAggregate } from './proposerIdentity';

const $delegatedVotesInChain = combine(
  {
    votes: delegatedVotesModel.$delegatedVotes,
    chainId: networkSelectorModel.$governanceChainId,
  },
  ({ votes, chainId }) => {
    if (!chainId) return {};

    return votes[chainId] ?? {};
  },
);

sample({
  clock: [referendumModel.events.referendumsReceived, networkSelectorModel.$network, walletModel.$activeWallet],
  source: {
    wallet: walletModel.$activeWallet,
    network: networkSelectorModel.$network,
  },
  filter: ({ wallet, network }) => nonNullable(wallet) && nonNullable(network),
  fn: ({ wallet, network }) => {
    return {
      addresses: wallet!.accounts.map((acc) => toAddress(acc.accountId, { prefix: network!.chain.addressPrefix })),
      chain: network!.chain,
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
