import { type ReferendumId } from '@/shared/pallet/referenda';
import { useMembers, useVotes as useVotesDomain } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useVotes = (referendumId: ReferendumId) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: members } = useMembers({ palletType: 'fellowship', api });

  const accounts = members.map(member => member.accountId);

  const { data: votes, pending } = useVotesDomain({
    palletType: 'fellowship',
    chain,
    api,
    referendums: [referendumId],
    accounts,
  });

  return { votes, pending, chain };
};
