import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, useVotes } from '@/domains/collectives';
import { useFellowshipAccount } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useReferendumVote = (referendum: Referendum | null) => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const { data: account } = useFellowshipAccount();

  const { data: accountsVotes, pending } = useVotes({
    palletType: 'fellowship',
    api,
    chain,
    referendums: nonNullable(referendum) ? [referendum.id] : [],
    accounts: nonNullable(account) ? [account.accountId] : [],
  });

  const referendumVote = accountsVotes.find(voting => voting.referendumId === referendum?.id);

  return { data: referendumVote, pending };
};
