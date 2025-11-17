import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { useFeed } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const useMemberFeed = () => {
  const chain = useFellowshipChain();
  const { data: member, pending: pendingMember } = useFellowshipMember();
  const { data: feed, pending: pendingFeed } = useFeed({ palletType: 'fellowship', chain });

  const data = useMemo(() => {
    if (nullable(member)) {
      return [];
    }

    return feed.filter(r => r.accountId === member.accountId);
  }, [feed, member]);

  return { data, pending: pendingMember || pendingFeed };
};
