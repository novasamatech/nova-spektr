import { useMemo } from 'react';

import { referendumService, useReferendums } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useCompletedReferendums = () => {
  const api = useFellowshipApi();
  const { data: referendums, pending } = useReferendums({ palletType: 'fellowship', api });
  const completedReferendums = useMemo(() => referendums.filter(referendumService.isCompleted), [referendums]);

  return { data: completedReferendums, pending };
};
