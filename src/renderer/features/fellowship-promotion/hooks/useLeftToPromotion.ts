import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService, useEvidencePeriod, useFeed } from '@/domains/collectives';
import { useBlock } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useLeftToPromotion = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: currentBlock, pending: blockPending } = useBlock(api);
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });

  const leftToPromotion = useMemo(() => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock)) {
      return null;
    }

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);
    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    return evidenceService.getBlockUntilNextPromotion(memberWithPromotionStart, periods, currentBlock);
  }, [periods, member, currentBlock, feed]);

  return { data: leftToPromotion, pending: memberPending || periodPending || blockPending || feedPending };
};
