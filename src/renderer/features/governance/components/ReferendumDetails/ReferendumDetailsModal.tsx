/* eslint-disable import-x/max-dependencies */
import { type ApiPromise } from '@polkadot/api';
import { useGate, useStoreMap, useUnit } from 'effector-react';
import { generatePath } from 'react-router-dom';

import { type Asset, type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { Paths } from '@/shared/routes';
import { getAppUrl } from '@/shared/routes/utils';
import { Button, Icon, IconButton, Plate } from '@/shared/ui';
import { Copy, Modal } from '@/shared/ui-kit';
import { referendumService } from '@/entities/governance';
import { networkUtils } from '@/entities/network';
import { walletUtils } from '@/entities/wallet';
import { walletSelect } from '@/aggregates/wallet-select';
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
  const wallet = useUnit(walletSelect.$selectedWallet);

  const [showWalletVotes, toggleShowWalletVotes] = useToggle();
  const [showVoteHistory, toggleShowVoteHistory] = useToggle();
  const [showAdvanced, toggleShowAdvanced] = useToggle();

  const identity = useStoreMap({
    store: proposerIdentityAggregate.$proposers,
    keys: [referendum.votedByDelegates],
    fn: (proposers, [delegates]) => listService.getMappedIdentity(proposers, delegates),
  });

  const closeModal = (open: boolean) => {
    if (open) return;
    onClose();
  };

  const referendumPath = generatePath(Paths.GOVERNANCE_REFERENDUM, {
    chainId: networkUtils.chainNameToUrl(chain.name),
    referendumId: referendum.referendumId,
  });
  const referendumLink = getAppUrl(referendumPath);

  const ShareButton = (
    <Copy value={referendumLink.href} notification={t('governance.referendums.linkCopied')}>
      <div className="flex cursor-pointer items-center gap-1 text-primary-button-background-default hover:text-primary-button-background-hover active:text-primary-button-background-active">
        <Icon className="shrink-0 text-inherit" name="export" size={16} />
        <span className="text-inherit">{t('governance.referendums.linkShare')}</span>
      </div>
    </Copy>
  );

  return (
    <Modal isOpen size="xl" onToggle={closeModal}>
      <Modal.Title close action={ShareButton}>
        {t('governance.referendums.referendumTitle', { index: referendum.referendumId })}
      </Modal.Title>
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
              {(referendum.voting.votes.length > 0 || referendum.votedByDelegates.length > 0) && (
                <DetailsCard>
                  <div className="grid grid-cols-[270px_auto] items-center justify-between gap-x-1">
                    <VotedBy
                      direction="column"
                      chain={chain}
                      asset={asset}
                      identity={identity}
                      delegates={referendum.votedByDelegates}
                      castingVotes={referendum.voting.votes}
                      multiplier={walletUtils.isSingleShard(wallet)}
                    />
                    <IconButton name="info" className="shrink-0" onClick={toggleShowWalletVotes} />
                  </div>
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
