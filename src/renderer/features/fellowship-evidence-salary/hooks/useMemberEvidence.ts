import { useResource } from '@/shared/query';
import { evidence } from '@/domains/collectives';
import { useFellowshipMember } from '@/aggregates/fellowship-member';
import { useFellowshipApi } from '@/aggregates/fellowship-network';

export const useMemberEvidence = () => {
  const member = useFellowshipMember();
  const api = useFellowshipApi();

  return useResource(evidence.evidenceResource, {
    params: member &&
      api && {
        palletType: 'fellowship',
        api,
        chainId: api.genesisHash.toHex(),
        accounts: [member.accountId],
      },
    defaultValue: null,
    map(cache, { palletType, chainId }) {
      const evidences = cache[palletType]?.[chainId];
      if (evidences && member) {
        return evidences.find(e => e.accountId === member.accountId);
      }
    },
  });
};
