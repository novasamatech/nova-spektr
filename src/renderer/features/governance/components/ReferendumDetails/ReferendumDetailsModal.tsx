/* eslint-disable import-x/max-dependencies */
import { type ApiPromise } from '@polkadot/api';
import { useGate, useStoreMap, useUnit } from 'effector-react';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { nullable } from '@/shared/lib/utils';
import { Button, IconButton, Plate } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { referendumService } from '@/entities/governance';
import { walletModel } from '@/entities/wallet';
import { detailsAggregate } from '../../aggregates/details';
import { proposerIdentityAggregate } from '../../aggregates/proposerIdentity';
import { listService } from '../../lib/listService';
import { type AggregatedReferendum } from '../../types/structs';
import { VotedBy } from '../VotedBy';
import { VotingHistoryDialog } from '../VotingHistory/VotingHistoryDialog';

import { AdvancedModal } from './AdvancedModal';
import { DetailsCard } from './DetailsCard';
import { MyVotesModal } from './MyVotesModal';
import { ProposalDescription } from './ProposalDescription';
import { ReferendumAdditional } from './ReferendumAdditional';
import { Timeline } from './Timeline';
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
  const { t } = useI18n();

  useGate(detailsAggregate.gates.flow, { chain, referendum });

  const canVote = useUnit(detailsAggregate.$canVote);
  const hasAccount = useUnit(detailsAggregate.$hasAccount);
  const wallet = useUnit(walletModel.$activeWallet);

  const [showWalletVotes, toggleShowWalletVotes] = useToggle();
  const [showVoteHistory, toggleShowVoteHistory] = useToggle();
  const [showAdvanced, toggleShowAdvanced] = useToggle();
  const [isModalOpen, closeModal] = useModalClose(true, onClose);

  const identity = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [referendum.votedByDelegates],
    fn: (proposers, [delegates]) => {
      if (nullable(delegates)) return {};

      return listService.getMappedIdentity(proposers, delegates);
    },
  });

  return (
    <Modal isOpen={isModalOpen} size="xl" onToggle={closeModal}>
      <Modal.Title close>{t('governance.referendums.referendumTitle', { index: referendum.referendumId })}</Modal.Title>
      <Modal.Content>
        <section className="flex h-full w-modal-xl flex-col bg-main-app-background">
          <div className="flex min-h-full flex-wrap-reverse items-end gap-4 p-6">
            <Plate className="min-h-0 min-w-80 grow basis-[500px] border-filter-border p-6 shadow-card-shadow">
              <ProposalDescription
                chainId={chain.chainId}
                addressPrefix={chain.addressPrefix}
                referendum={referendum}
              />
            </Plate>

            <div className="flex shrink-0 grow basis-[320px] flex-row flex-wrap gap-4">
              <DetailsCard>
                <Box direction="row" verticalAlign="center" horizontalAlign="space-between">
                  <VotedBy
                    asset={asset}
                    identity={identity}
                    delegates={Object.values(referendum.votedByDelegates)}
                    castingVotes={referendum.voting.votes}
                  />
                  <IconButton name="info" onClick={toggleShowWalletVotes} />
                </Box>
              </DetailsCard>

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
        </section>
      </Modal.Content>

      {showWalletVotes && (
        <MyVotesModal referendum={referendum} chain={chain} asset={asset} onClose={toggleShowWalletVotes} />
      )}

      {showVoteHistory && <VotingHistoryDialog referendum={referendum} onClose={toggleShowVoteHistory} />}

      {showAdvanced && referendumService.isOngoing(referendum) && (
        <AdvancedModal asset={asset} referendum={referendum} onClose={toggleShowAdvanced} />
      )}
    </Modal>
  );
};
