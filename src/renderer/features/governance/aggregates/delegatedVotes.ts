import { combine, sample } from 'effector';

import { nonNullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { referendumModel } from '@/entities/governance';
import { walletSelect } from '@/aggregates/wallet-select';
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
  clock: [referendumModel.events.referendumsReceived, networkSelectorModel.$network, walletSelect.$selectedWallet],
  source: {
    wallet: walletSelect.$selectedWallet,
    network: networkSelectorModel.$network,
  },
  filter: ({ wallet, network }) => nonNullable(wallet) && nonNullable(network),
  fn: ({ wallet, network }) => {
    const accounts = wallet!.accounts.map((acc) => acc.accountId);

    return { accounts, chain: network!.chain };
  },
  target: delegatedVotesModel.events.requestDelegatedVotes,
});

sample({
  clock: delegatedVotesModel.events.requestDelegatedVotesDone,
  fn: ({ result }) => {
    const uniqDelegates = new Set<AccountId>();

    for (const referendumId of Object.keys(result)) {
      for (const delegate of result[referendumId]) {
        uniqDelegates.add(delegate.delegateAccount);
      }
    }

    return { accounts: Array.from(uniqDelegates) };
  },
  target: proposerIdentityAggregate.events.requestProposers,
});

export const delegatedVotesAggregate = {
  $delegatedVotes: delegatedVotesModel.$delegatedVotes,
  $delegatedVotesInChain,
};
