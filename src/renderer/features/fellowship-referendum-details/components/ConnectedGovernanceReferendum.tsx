import { useUnit } from 'effector-react';
import { useCallback, useState } from 'react';

import { nullable } from '@/shared/lib/utils';
import { type ReferendumId } from '@/shared/pallet/referenda';
import { Box, Markdown } from '@/shared/ui-kit';
import { useReferendumSummary } from '@/domains/governance';
import { networkModel } from '@/entities/network';
import { ReferendumItem } from '@/features/governance/components/ReferendumList/ReferendumItem';
import { GovernanceReferendumDetailsModal, useReferendum } from '@/pages/Governance';
import { useConnectedReferendum } from '../hooks/useConnectedReferendum';

import { Card } from './Card';

type Props = {
  referendumId: ReferendumId;
};

export const ConnectedGovernanceReferendum = ({ referendumId }: Props) => {
  const { data: connectedReferendum } = useConnectedReferendum(referendumId);
  const connectedGovernanceReferendum = useReferendum(connectedReferendum?.referendumId);
  const { data: connectedGovernanceReferendumSummary } = useReferendumSummary({
    chainId: connectedReferendum?.chainId,
    referendumIds: [connectedReferendum?.referendumId],
  });
  const chains = useUnit(networkModel.$chains);
  const apis = useUnit(networkModel.$apis);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const onSelect = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  if (nullable(connectedReferendum) || nullable(connectedGovernanceReferendum)) {
    return null;
  }

  const chain = chains[connectedReferendum.chainId];
  const connectedGovernanceReferendumSummaryText =
    connectedGovernanceReferendumSummary?.[connectedReferendum?.referendumId].summary;
  const timelineApi = chain.additional?.timelineChain ? apis[chain.additional.timelineChain] : null;

  return (
    <>
      {connectedGovernanceReferendumSummaryText && (
        <Card>
          <Box padding={6}>
            <Markdown>{connectedGovernanceReferendumSummaryText}</Markdown>
          </Box>
        </Card>
      )}
      <ReferendumItem
        timelineApi={timelineApi!}
        chain={chain}
        asset={chain.assets.at(0)!}
        referendum={connectedGovernanceReferendum}
        isTitlesLoading={false}
        isApprovalThresholdsLoading={false}
        onSelect={onSelect}
      />

      {isModalOpen && (
        <GovernanceReferendumDetailsModal
          referendum={connectedGovernanceReferendum}
          chainId={chain.chainId}
          onClose={onClose}
        />
      )}
    </>
  );
};
