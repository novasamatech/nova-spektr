import { useUnit } from 'effector-react';

import { type Evidence, type Referendum, $ipfsGateways, useEvidencesContent } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { useEvidenceHash } from './useEvidenceHash';

export const useEvidenceContent = ({
  referendum,
  evidence,
}: {
  referendum?: Referendum | null;
  evidence?: Evidence | null;
}) => {
  const chain = useFellowshipChain();
  const gateways = useUnit($ipfsGateways);

  const { data: evidenceHash, pending: pendingEvidenceHash } = useEvidenceHash({ referendum, evidence });

  const { data: content, pending: pendingContent } = useEvidencesContent({
    palletType: 'fellowship',
    chainId: chain?.chainId,
    evidenceHash: evidence?.hash || evidenceHash,
    gateways,
  });

  return { data: content, pending: pendingEvidenceHash || pendingContent };
};
