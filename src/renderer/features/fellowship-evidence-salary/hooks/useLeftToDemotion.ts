import { nonNullable } from '@/shared/lib/utils';
import { evidenceService, useEvidencePeriod } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi, useFellowshipBlock, useFellowshipChain } from '@/aggregates/fellowship-network';

export const useLeftToDemotion = () => {
  const api = useFellowshipApi();
  const chain = useFellowshipChain();
  const member = useFellowshipMember();

  const { data: periods, pending: periodsPending } = useEvidencePeriod({ palletType: 'fellowship', api, chain });
  const { data: block, pending: blockPending } = useFellowshipBlock();

  return {
    data:
      nonNullable(block) && nonNullable(periods) && nonNullable(member)
        ? evidenceService.getBlocksUntilDemotion(member, periods, block)
        : null,
    pending: blockPending || periodsPending,
  };
};
