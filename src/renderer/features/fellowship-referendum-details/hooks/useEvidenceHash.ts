import { useMemo } from 'react';

import { type Evidence, type Referendum, useEvidenceToReferendumRelations } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const useEvidenceHash = ({
  referendum,
  evidence,
}: {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
}) => {
  const chain = useFellowshipChain();

  const { data: evidenceToReferendumRelations, pending: pendingEvidenceToReferendumRelations } =
    useEvidenceToReferendumRelations({ palletType: 'fellowship', chain });

  const evidenceHash = useMemo(() => {
    const hashes = evidenceToReferendumRelations
      .find(x => x.referendumId === referendum?.id)
      ?.evidence.flatMap(e => e.hash);
    return hashes?.at(0) ?? null;
  }, [evidenceToReferendumRelations]);

  return { data: evidence?.hash || evidenceHash, pending: pendingEvidenceToReferendumRelations };
};
