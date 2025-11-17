import { nonNullable } from '@/shared/lib/utils';
import { type Referendum, referendumService, useRfcSummary } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

export const useRfcProposalSummary = (referendum: Referendum | null) => {
  let prNumber: string | null = null;

  const proposal = nonNullable(referendum) && referendumService.isOngoing(referendum) ? referendum.proposal : null;
  if (proposal?.type === 'Rfc') {
    prNumber = proposal.pullRequest;
  }

  const chain = useFellowshipChain();

  return useRfcSummary({ palletType: 'fellowship', chainId: chain?.chainId, prNumber });
};
