import { nonNullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { useVotes } from '@/domains/collectives';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useReferendumVote = (referendumId?: ReferendumId) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: account } = useFellowshipAccount();

  const { data: accountsVotes, pending } = useVotes({
    palletType: 'fellowship',
    api,
    chain,
    referendums: nonNullable(referendumId) ? [referendumId] : [],
    accounts: nonNullable(account) ? [account.accountId] : [],
  });

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendumId);

  return { data: referendumVote, pending };
};
