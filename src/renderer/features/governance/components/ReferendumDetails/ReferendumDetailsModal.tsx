import { type ApiPromise } from '@polkadot/api';
import { BN_ZERO } from '@polkadot/util';
import { useGate, useUnit } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { BaseModal, Button, Plate } from '@/shared/ui';
import { referendumService, votingService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { type AggregatedReferendum } from '../../types/structs';
import { VotingHistoryDialog } from '../VotingHistory/VotingHistoryDialog';

import { AdvancedModal } from './AdvancedModal';
import { DetailsCard } from './DetailsCard';
import { MyVotesModal } from './MyVotesModal';
import { ProposalDescription } from './ProposalDescription';
import { ReferendumAdditional } from './ReferendumAdditional';
import { Timeline } from './Timeline';
import { VotingBalance } from './VotingBalance';
import { VotingStatus } from './VotingStatus';
import { VotingSummary } from './VotingSummary';

type Props = {
  chain: Chain;
  api: ApiPromise;
  asset: Asset;
  referendum: AggregatedReferendum;
  showActions?: boolean;
  onVoteRequest: () => unknown;
  onRevoteRequest: () => unknown;
  onRemoveVoteRequest: () => unknown;
  onClose: VoidFunction;
};

export const ReferendumDetailsModal = ({
  chain,
  api,
  asset,
  referendum,
  showActions,
  onClose,
  onVoteRequest,
  onRevoteRequest,
  onRemoveVoteRequest,
}: Props) => {
  useGate(detailsAggregate.gates.flow, { chain, referendum });

  const [showWalletVotes, toggleShowWalletVotes] = useToggle();
  const [showVoteHistory, toggleShowVoteHistory] = useToggle();
  const [showAdvanced, toggleShowAdvanced] = useToggle();

  const { t } = useI18n();

  const canVote = useUnit(detailsAggregate.$canVote);
  const hasAccount = useUnit(detailsAggregate.$hasAccount);
  const wallet = useUnit(walletModel.$activeWallet);

  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const votingBalance = referendum.voting.votes.reduce(
    (acc, vote) => acc.add(votingService.calculateAccountVotePower(vote.vote)),
    BN_ZERO,
  );

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
      contentClass="min-h-0 h-full w-full bg-main-app-background overflow-y-auto"
      panelClass="flex flex-col w-modal-xl h-[678px]"
      headerClass="pl-5 pr-3 py-4 shrink-0"
      closeButton
      onClose={closeModal}
    >
      <div className="flex min-h-full flex-wrap-reverse items-end gap-4 p-6">
        <Plate className="min-h-0 min-w-80 grow basis-[500px] border-filter-border p-6 shadow-card-shadow">
          <ProposalDescription chainId={chain.chainId} addressPrefix={chain.addressPrefix} referendum={referendum} />
        </Plate>

        <div className="flex shrink-0 grow basis-[320px] flex-row flex-wrap gap-4">
          {referendum.voting.votes.length > 0 && (
            <DetailsCard>
              <VotingBalance votes={votingBalance} asset={asset} onInfoClick={toggleShowWalletVotes} />
            </DetailsCard>
          )}

          <DetailsCard title={t('governance.referendum.votingStatus')}>
            <VotingStatus
              api={api}
              referendum={referendum}
              asset={asset}
              canVote={showActions ?? canVote}
              hasAccount={hasAccount}
              wallet={wallet}
              onVoteRequest={onVoteRequest}
              onRevoteRequest={onRevoteRequest}
              onRemoveVoteRequest={onRemoveVoteRequest}
            />
          </DetailsCard>

          <DetailsCard
            title={t('governance.referendum.votingSummary')}
            action={
              <Button variant="text" size="sm" className="h-fit p-0" onClick={toggleShowVoteHistory}>
                {t('governance.voteHistory.viewVoteHistory')}
              </Button>
            }
          >
            <VotingSummary referendum={referendum} chain={chain} asset={asset} />
          </DetailsCard>

          <DetailsCard title={t('governance.referendum.additional')}>
            <ReferendumAdditional network={chain.specName} referendumId={referendum.referendumId} />
          </DetailsCard>

          <DetailsCard title={t('governance.referendum.timeline')}>
            <Timeline referendumId={referendum.referendumId} />
          </DetailsCard>

          {referendumService.isOngoing(referendum) && (
            <DetailsCard>
              <Button className="h-auto w-fit p-0" size="sm" variant="text" onClick={toggleShowAdvanced}>
                {t('governance.referendum.advanced')}
              </Button>
            </DetailsCard>
          )}
        </div>
      </div>

      {showWalletVotes && (
        <MyVotesModal referendum={referendum} chain={chain} asset={asset} onClose={toggleShowWalletVotes} />
      )}

      {showVoteHistory && <VotingHistoryDialog referendum={referendum} onClose={toggleShowVoteHistory} />}

      {showAdvanced && referendumService.isOngoing(referendum) && (
        <AdvancedModal asset={asset} referendum={referendum} onClose={toggleShowAdvanced} />
      )}
    </BaseModal>
  );
};
