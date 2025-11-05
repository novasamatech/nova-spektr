import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService, useEvidencePeriod, useFeed } from '@/domains/collectives';
import { useBlockTime } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const usePromotionPeriod = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });

  const promotionPeriod = useMemo(() => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const importedBlock = feed?.find(f => f.accountId === member.accountId && f.type === 'imported')?.block ?? 0;
    const from = member.lastPromotion !== 0 ? member.lastPromotion : importedBlock;

    return {
      from,
      to: evidenceService.getPromotionPeriod(member, periods) + from,
    };
  }, [periods, member, feed]);

  return { data: promotionPeriod, pending: memberPending || periodPending || feedPending };
};

export const usePromotionPeriodDates = () => {
  const api = useFellowshipApi();
  const { data: promotionPeriod } = usePromotionPeriod();

  const { data: fromDate, pending: fromDatePending } = useBlockTime({
    api,
    blockHeight: promotionPeriod?.from ?? null,
  });
  const { data: toDate, pending: toDatePending } = useBlockTime({ api, blockHeight: promotionPeriod?.to ?? null });

  return { data: { from: fromDate, to: toDate }, pending: fromDatePending || toDatePending };
};
