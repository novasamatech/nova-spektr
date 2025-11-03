import { salaryService, useSalaryCycleResource } from '@/domains/collectives';
import { useBlock } from '@/domains/network';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useCurrentSalaryPeriod = () => {
  const api = useFellowshipApi();
  const { data: block, pending: blockPending } = useBlock(api);
  const { data: cycle, pending: cyclePending } = useSalaryCycleResource('fellowship', api);

  return {
    data: cycle && block ? salaryService.getCurrentPeriod(cycle, block) : null,
    pending: blockPending || cyclePending,
  };
};
