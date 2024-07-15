import { useGate, useStoreMap } from 'effector-react';
import { useState } from 'react';

import { useI18n } from '@app/providers';
import { type Chain } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { BaseModal, Button, Plate } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { referendumService } from '@entities/governance';
import { detailsAggregate } from '../../aggregates/details';
import { ProposalDescription } from './ProposalDescription';
import { AggregatedReferendum } from '../../types/structs';
import { VotingHistoryDialog } from '../VotingHistory/VotingHistoryDialog';
import { VotingSummary } from './VotingSummary';
import { VotingStatus } from './VotingStatus';
import { DetailsCard } from './DetailsCard';
import { ReferendumAdditional } from './ReferendumAdditional';

type Props = {
  chain: Chain;
  referendum: AggregatedReferendum;
  onClose: VoidFunction;
};

export const ReferendumDetailsDialog = ({ chain, referendum, onClose }: Props) => {
  useGate(detailsAggregate.gates.flow, { chain, referendum });

  const [showVoteHistory, setShowVoteHistory] = useState(false);

  const { t } = useI18n();

  const title = useStoreMap({
    store: detailsAggregate.$titles,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const votingAsset = useStoreMap({
    store: detailsAggregate.$votingAssets,
    keys: [chain.chainId],
    fn: (x, [chainId]) => x[chainId],
  });

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={title || t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
      contentClass="min-h-0 h-full w-full bg-main-app-background overflow-y-auto"
      panelClass="flex flex-col w-[944px] h-[678px]"
      headerClass="pl-5 pr-3 py-4 shrink-0"
      closeButton
      onClose={closeModal}
    >
      <div className="flex flex-wrap-reverse items-end gap-4 p-6 min-h-full">
        <Plate className="min-h-0 min-w-80 basis-[530px] grow p-6 shadow-card-shadow border-filter-border">
          <ProposalDescription chainId={chain.chainId} referendum={referendum} />
        </Plate>

        <div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">
          <DetailsCard title={t('governance.referendum.votingStatus')}>
            <VotingStatus referendum={referendum} chain={chain} asset={votingAsset} />
          </DetailsCard>

          {referendumService.isOngoing(referendum) && votingAsset && (
            <DetailsCard
              title={t('governance.referendum.votingSummary')}
              action={
                <Button variant="text" size="sm" className="p-0 h-fit" onClick={() => setShowVoteHistory(true)}>
                  {t('governance.voteHistory.viewVoteHistory')}
                </Button>
              }
            >
              <VotingSummary referendum={referendum} asset={votingAsset} />
            </DetailsCard>
          )}

          <DetailsCard title={t('governance.referendum.additional')}>
            <ReferendumAdditional network={chain.specName} referendumId={referendum.referendumId} />
          </DetailsCard>
        </div>
      </div>

      {showVoteHistory && <VotingHistoryDialog referendum={referendum} onClose={() => setShowVoteHistory(false)} />}
    </BaseModal>
  );
};
