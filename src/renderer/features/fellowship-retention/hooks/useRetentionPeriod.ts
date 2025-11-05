import { useMemo } from 'react';

import { nullable } from '@/shared/lib/utils';
import { evidenceService, memberService, useEvidencePeriod } from '@/domains/collectives';
import { useBlockTime } from '@/domains/network';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useRetentionPeriod = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();

  const { data: member, pending: memberPending } = useFellowshipMember();
  const { data: periods, pending: periodPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });

  const retentionPeriod = useMemo(() => {
    if (nullable(periods) || nullable(member) || !memberService.isCoreMember(member)) return null;

    const from = member.lastProof;
    const retentionPeriodLength = evidenceService.getDemotionPeriod(member, periods);

    return {
      from,
      to: from + retentionPeriodLength,
    };
  }, [periods, member]);

  return { data: retentionPeriod, pending: memberPending || periodPending };
};

export const useRetentionPeriodDates = () => {
  const api = useFellowshipApi();
  const { data: retentionPeriod } = useRetentionPeriod();

  const { data: fromDate, pending: fromDatePending } = useBlockTime({
    api,
    blockHeight: retentionPeriod?.from ?? null,
  });
  const { data: toDate, pending: toDatePending } = useBlockTime({ api, blockHeight: retentionPeriod?.to ?? null });

  return { data: { from: fromDate, to: toDate }, pending: fromDatePending || toDatePending };
};
