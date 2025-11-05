import { nonNullable } from '@/shared/lib/utils';
import { useVotes as useVotesDomain } from '@/domains/collectives';
import { useFellowshipAccount, useMemberRetentionReferendum } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useVotes = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: account } = useFellowshipAccount();
  const { data: referendum } = useMemberRetentionReferendum();

  return useVotesDomain({
    palletType: 'fellowship',
    chain,
    api,
    referendums: nonNullable(referendum) ? [referendum.id] : [],
    accounts: account ? [account.accountId] : null,
  });
};
