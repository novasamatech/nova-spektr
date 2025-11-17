import { type ReferendumId } from '@/shared/pallet/referenda';
import { useMembers, useVotes } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useReferendumVotes = (referendumId: ReferendumId) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: members } = useMembers({ palletType: 'fellowship', api });

  const accounts = members.map(member => member.accountId);

  const { data: votes, pending } = useVotes({
    palletType: 'fellowship',
    chain,
    api,
    referendums: [referendumId],
    accounts,
  });

  return { votes, pending, chain };
};
