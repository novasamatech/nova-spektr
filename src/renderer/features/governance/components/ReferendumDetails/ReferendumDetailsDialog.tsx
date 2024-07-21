import { useGate, useStoreMap } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Chain } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { formatBalance, pickNestedValue } from '@shared/lib/utils';
import { BaseModal, Button, Plate } from '@shared/ui';
import { referendumService, votingService } from '@entities/governance';
import { detailsAggregate } from '../../aggregates/details';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingHistoryDialog } from '../VotingHistory/VotingHistoryDialog';

import { AdvancedDialog } from './AdvancedDialog';
import { DetailsCard } from './DetailsCard';
import { ProposalDescription } from './ProposalDescription';
import { ReferendumAdditional } from './ReferendumAdditional';
import { Timeline } from './Timeline';
import { VotingBalance } from './VotingBalance';
import { VotingStatus } from './VotingStatus';
import { VotingSummary } from './VotingSummary';
import { WalletVotesDialog } from './WalletVotesDialog';

type Props = {
  chain: Chain;
  referendum: AggregatedReferendum;
  onClose: VoidFunction;
};

export const ReferendumDetailsDialog = ({ chain, referendum, onClose }: Props) => {
  useGate(detailsAggregate.gates.flow, { chain, referendum });

  const [showWalletVotes, setShowWalletVotes] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (x, [referendumId]) => votingService.getAllReferendumVotes(referendumId, x),
  });

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const formattedVotes = useMemo(
    () => formatBalance(votingService.getVotesTotalBalance(votes), votingAsset?.precision).formatted,
    [votes, votingAsset],
  );

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
          {referendum.isVoted && (
            <DetailsCard>
              <VotingBalance votes={formattedVotes} onInfoClick={() => setShowWalletVotes(true)} />
            </DetailsCard>
          )}

          <DetailsCard>
            <VotingBalance votes={formattedVotes} onInfoClick={() => setShowWalletVotes(true)} />
          </DetailsCard>

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

          <DetailsCard title={t('governance.referendum.timeline')}>
            <Timeline referendumId={referendum.referendumId} />
          </DetailsCard>

          <DetailsCard>
            <Button className="p-0 h-auto w-fit" size="sm" variant="text" onClick={() => setShowAdvanced(true)}>
              {t('governance.referendum.advanced')}
            </Button>
          </DetailsCard>
        </div>
      </div>

      {showWalletVotes && <WalletVotesDialog referendum={referendum} onClose={() => setShowWalletVotes(false)} />}

      {showVoteHistory && <VotingHistoryDialog referendum={referendum} onClose={() => setShowVoteHistory(false)} />}

      {showAdvanced && referendumService.isOngoing(referendum) && votingAsset && (
        <AdvancedDialog asset={votingAsset} referendum={referendum} onClose={() => setShowAdvanced(false)} />
      )}
    </BaseModal>
  );
};
