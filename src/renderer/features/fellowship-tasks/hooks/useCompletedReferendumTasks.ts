import { useMemo } from 'react';

import { nonNullable } from '@/shared/lib/utils';
import { type CompletedReferendum, useReferendumsMapToGovernance } from '@/domains/collectives';
import { useReferendumSummary } from '@/domains/governance';
import { useFellowshipChain } from '@/aggregates/fellowship-network';
import { CompletedReferendumVoting } from '../components/tasks/CompletedReferendumVoting';
import { type TaskDescription } from '../types';

import { useCompletedReferendums } from './useCompletedReferendums';

export const useCompletedReferendumTasks = () => {
  const chain = useFellowshipChain();
  const { data: referendums, pending: pendingReferendums } = useCompletedReferendums();

  const { data: referendumsMapToGovernance, pending: pendingReferendumsMapToGovernance } =
    useReferendumsMapToGovernance({
      chain,
      palletType: 'fellowship',
    });

  // Batch fetch governance referendum summaries
  const { governanceChainId, governanceReferendumIds } = useMemo(() => {
    const connected = Object.values(referendumsMapToGovernance).filter(nonNullable);
    const chainId = connected[0]?.chainId ?? null;
    const ids = connected.map(c => c.referendumId);
    return { governanceChainId: chainId, governanceReferendumIds: ids };
  }, [referendumsMapToGovernance]);

  const { data: governanceReferendumSummaries } = useReferendumSummary({
    chainId: governanceChainId,
    referendumIds: governanceReferendumIds,
  });

  const tasks = useMemo(() => {
    return referendums.map<
      TaskDescription<{ referendum: CompletedReferendum; connectedGovernanceReferendumSummary: string | null }>
    >(referendum => {
      const connectedReferendumRelation = referendumsMapToGovernance[referendum.id] ?? null;
      const connectedGovernanceReferendumId = connectedReferendumRelation?.referendumId ?? null;
      const connectedSummary = connectedGovernanceReferendumId
        ? (governanceReferendumSummaries?.[connectedGovernanceReferendumId]?.summary ?? null)
        : null;

      return {
        id: `referendum_completed_${referendum.id}`,
        weight: referendum.id,
        group: 'completed',
        body: CompletedReferendumVoting,
        meta: {
          referendum,
          transaction: null,
          tags: [],
          connectedGovernanceReferendumSummary: connectedSummary,
        },
      };
    });
  }, [referendums, referendumsMapToGovernance, governanceReferendumSummaries]);

  return { data: tasks, pending: pendingReferendums || pendingReferendumsMapToGovernance };
};
