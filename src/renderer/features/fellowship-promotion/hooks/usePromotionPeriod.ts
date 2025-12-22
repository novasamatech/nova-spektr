import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
import { evidenceService, memberService, useEvidencePeriod, useFeed } from '@/domains/collectives';
import { useBlock, useBlockTimestamp } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const usePromotionPeriod = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: feed, pending: feedPending } = useFeed({ palletType: 'fellowship', chain });
  const { data: currentBlock, pending: blockPending } = useBlock(api);

  const promotionPeriod = useMemo(() => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member) || nullable(currentBlock))
      return null;

    const memberWithPromotionStart = evidenceService.getMemberWithPromotionStart(member, feed);

    if (nullable(memberWithPromotionStart)) {
      return null;
    }

    const window = evidenceService.getPromotionWindow(memberWithPromotionStart, periods);
    const from = Number(window.from);
    const to = Number(window.to);

    if (!Number.isFinite(from) || !Number.isFinite(to) || from <= 0 || to <= 0) {
      return null;
    }

    return {
      from: pjsSchema.helpers.toBlockHeight(from),
      to: pjsSchema.helpers.toBlockHeight(to),
    };
  }, [periods, member, feed, currentBlock]);

  return { data: promotionPeriod, pending: memberPending || periodPending || feedPending || blockPending };
};

export const usePromotionPeriodDates = () => {
  const api = useFellowshipApi();
  const { data: promotionPeriod } = usePromotionPeriod();

  const { data: fromDate, pending: fromDatePending } = useBlockTimestamp({
    api,
    blockHeight: promotionPeriod?.from ?? null,
  });
  const { data: toDate, pending: toDatePending } = useBlockTimestamp({ api, blockHeight: promotionPeriod?.to ?? null });

  return { data: { from: fromDate, to: toDate }, pending: fromDatePending || toDatePending };
};
