import { useGate, useStoreMap, useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@app/providers';
import { type Chain } from '@shared/core';
import { useModalClose } from '@shared/lib/hooks';
import { BaseModal, Button, Plate } from '@shared/ui';
import { walletModel } from '@/entities/wallet';
import { referendumService, votingService } from '@entities/governance';
import { detailsAggregate } from '../../aggregates/details';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingHistoryDialog } from '../VotingHistory/VotingHistoryDialog';

import { AdvancedDialog } from './AdvancedDialog';
import { DetailsCard } from './DetailsCard';
import { MyVotesDialog } from './MyVotesDialog';
import { ProposalDescription } from './ProposalDescription';
import { ReferendumAdditional } from './ReferendumAdditional';
import { Timeline } from './Timeline';
import { VotingBalance } from './VotingBalance';
import { VotingStatus } from './VotingStatus';
import { VotingSummary } from './VotingSummary';

type Props = {
  chain: Chain;
  referendum: AggregatedReferendum;
  onVoteRequest: () => unknown;
  onRemoveVoteRequest: () => unknown;
  onClose: VoidFunction;
};

export const ReferendumDetailsDialog = ({ chain, referendum, onVoteRequest, onRemoveVoteRequest, onClose }: Props) => {
  useGate(detailsAggregate.gates.flow, { chain, referendum });

  const [showWalletVotes, setShowWalletVotes] = useState(false);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { t } = useI18n();

  const votingAsset = useUnit(detailsAggregate.$votingAsset);
  const canVote = useUnit(detailsAggregate.$canVote);
  const hasAccount = useUnit(detailsAggregate.$hasAccount);
  const wallet = useUnit(walletModel.$activeWallet);

  const votes = useStoreMap({
    store: detailsAggregate.$votes,
    keys: [referendum.referendumId],
    fn: (votes, [referendumId]) => votingService.getReferendumAccountVotes(referendumId, votes),
  });

  const totalVotes = useMemo(
    () => votingService.calculateAccountVotesTotalBalance(Object.values(votes)),
    [votes, votingAsset],
  );

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
      contentClass="min-h-0 h-full w-full bg-main-app-background overflow-y-auto"
      panelClass="flex flex-col w-[954px] h-[678px]"
      headerClass="pl-5 pr-3 py-4 shrink-0"
      closeButton
      onClose={closeModal}
    >
      <div className="flex min-h-full flex-wrap-reverse items-end gap-4 p-6">
        <Plate className="min-h-0 min-w-80 grow basis-[500px] border-filter-border p-6 shadow-card-shadow">
          <ProposalDescription chainId={chain.chainId} addressPrefix={chain.addressPrefix} referendum={referendum} />
        </Plate>

        <div className="flex shrink-0 grow basis-[320px] flex-row flex-wrap gap-4">
          {referendum.vote && votingAsset && (
            <DetailsCard>
              <VotingBalance votes={totalVotes} asset={votingAsset} onInfoClick={() => setShowWalletVotes(true)} />
            </DetailsCard>
          )}

          <DetailsCard title={t('governance.referendum.votingStatus')}>
            <VotingStatus
              referendum={referendum}
              asset={votingAsset}
              canVote={canVote}
              hasAccount={hasAccount}
              wallet={wallet}
              onVoteRequest={onVoteRequest}
              onRemoveVoteRequest={onRemoveVoteRequest}
            />
          </DetailsCard>

          {referendumService.isOngoing(referendum) && !!votingAsset && (
            <DetailsCard
              title={t('governance.referendum.votingSummary')}
              action={
                <Button variant="text" size="sm" className="h-fit p-0" onClick={() => setShowVoteHistory(true)}>
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

          {referendumService.isOngoing(referendum) && !!votingAsset && (
            <DetailsCard>
              <Button className="h-auto w-fit p-0" size="sm" variant="text" onClick={() => setShowAdvanced(true)}>
                {t('governance.referendum.advanced')}
              </Button>
            </DetailsCard>
          )}
        </div>
      </div>

      {showWalletVotes && (
        <MyVotesDialog
          referendum={referendum}
          chain={chain}
          asset={votingAsset}
          onClose={() => setShowWalletVotes(false)}
        />
      )}

      {showVoteHistory && <VotingHistoryDialog referendum={referendum} onClose={() => setShowVoteHistory(false)} />}

      {showAdvanced && referendumService.isOngoing(referendum) && !!votingAsset && (
        <AdvancedDialog asset={votingAsset} referendum={referendum} onClose={() => setShowAdvanced(false)} />
      )}
    </BaseModal>
  );
};
