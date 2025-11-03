import { salaryService, useSalaryCycleResource } from '@/domains/collectives';
import { useFellowshipApi, useFellowshipBlock } from '@/aggregates/fellowship-network';

export const useCurrentSalaryPeriod = () => {
  const api = useFellowshipApi();
  const { data: block, pending: blockPending } = useFellowshipBlock();
  const { data: cycle, pending: cyclePending } = useSalaryCycleResource('fellowship', api);

  return {
    data: cycle && block ? salaryService.getCurrentPeriod(cycle, block) : null,
    pending: blockPending || cyclePending,
  };
};
