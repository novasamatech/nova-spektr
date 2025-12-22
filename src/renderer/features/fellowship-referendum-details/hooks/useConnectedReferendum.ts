import { useMemo } from 'react';

import { type ReferendumId } from '@/shared/pallet/referenda';
import { useReferendumsMapToGovernance } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const useConnectedReferendum = (referendumId: ReferendumId) => {
  const chain = useFellowshipChain();
  const { data: referendumsMapToGovernance, pending: pendingReferendumsMapToGovernance } =
    useReferendumsMapToGovernance({
      chain,
      palletType: 'fellowship',
    });

  const connectedReferendum = useMemo(() => {
    return referendumsMapToGovernance[referendumId] ?? null;
  }, [referendumsMapToGovernance, referendumId]);

  return {
    data: connectedReferendum,
    pending: pendingReferendumsMapToGovernance,
  };
};
