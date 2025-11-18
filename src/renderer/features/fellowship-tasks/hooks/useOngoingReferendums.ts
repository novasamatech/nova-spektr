import { useMemo } from 'react';

import { referendumService, useReferendums } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useOngoingReferendums = () => {
  const api = useFellowshipApi();
  const { data: referendums, pending } = useReferendums({ palletType: 'fellowship', api });
  const ongoingReferendums = useMemo(() => referendums.filter(referendumService.isOngoing), [referendums]);

  return { data: ongoingReferendums, pending };
};
