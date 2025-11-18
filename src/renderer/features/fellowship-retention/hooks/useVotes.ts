import { nonNullable } from '@/shared/lib/utils';
import { useMembers, useVotes as useVotesDomain } from '@/domains/collectives';
import { useMemberRetentionReferendum } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useVotes = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: referendum } = useMemberRetentionReferendum();
  const { data: members } = useMembers({ palletType: 'fellowship', api });

  const accounts = members.map(member => member.accountId);

  return useVotesDomain({
    palletType: 'fellowship',
    chain,
    api,
    referendums: nonNullable(referendum) ? [referendum.id] : [],
    accounts,
  });
};
