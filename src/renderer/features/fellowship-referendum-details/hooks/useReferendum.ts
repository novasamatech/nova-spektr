import { nonNullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { useReferendums } from '@/domains/collectives';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useReferendum = (referendumId: ReferendumId | null) => {
  const api = useFellowshipApi();
  const { data: referendums, pending } = useReferendums({ palletType: 'fellowship', api });

  const referendum = nonNullable(referendumId) ? (referendums.find(x => x.id === referendumId) ?? null) : null;

  return {
    data: referendum,
    pending,
  };
};
