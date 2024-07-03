import { useGate, useStoreMap, useUnit } from 'effector-react';

import { type Chain, type Referendum } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BaseModal, Plate, FootnoteText, Loader, Markdown, Shimmering } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { governanceModel, referendumUtils, TrackInfo } from '@entities/governance';
import { referendumDetailsModel } from '../model/referendum-details-model';
import { referendumListModel } from '../../ReferendumList/model/referendum-list-model';
import { VotingStatus } from './VotingStatus';
import { DetailsCard } from './DetailsCard';

type Props = {
  chain: Chain;
  referendum: Referendum;
  onClose: VoidFunction;
};

export const ReferendumDetails = ({ chain, referendum, onClose }: Props) => {
  useGate(referendumDetailsModel.input.flow, { chain, referendum });

  const { t } = useI18n();

  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);
  const isProposerLoading = useUnit(referendumDetailsModel.$isProposersLoading);

  const title = useStoreMap({
    store: referendumListModel.$referendumsTitles,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const proposer = useStoreMap({
    store: referendumDetailsModel.$proposers,
    keys: [chain.chainId, referendum],
    fn: (x, [chainId, referendum]) => {
      return referendumUtils.isOngoing(referendum) && referendum.submissionDeposit
        ? pickNestedValue(x, chainId, referendum.submissionDeposit.who)
        : null;
    },
  });

  const description = useStoreMap({
    store: referendumDetailsModel.$descriptions,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const approvalThreshold = useStoreMap({
    store: governanceModel.$approvalThresholds,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const supportThreshold = useStoreMap({
    store: governanceModel.$supportThresholds,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const [isModalOpen, closeModal] = useModalClose(Boolean(referendum), onClose);

  const asset = chain.assets.at(0) ?? null;

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
      <div className="ref-details flex flex-wrap-reverse items-end gap-4 p-6 min-h-full">
        <div className="h-full min-h-0 grow min-w-80 basis-[530px]">
          <Plate className="shadow-card-shadow border-filter-border h-fit p-6">
            <div className="flex items-center mb-4">
              {isProposerLoading || proposer ? (
                <FootnoteText className="text-text-secondary flex items-center">
                  {t('governance.referendum.proposer', {
                    name: proposer
                      ? proposer.parent.name ||
                        proposer.email ||
                        proposer.twitter ||
                        proposer.parent.address ||
                        'Unknown'
                      : null,
                  })}
                  {isProposerLoading && !proposer ? <Shimmering height={18} width={70} /> : null}
                </FootnoteText>
              ) : null}

              <div className="grow" />
              {'track' in referendum && <TrackInfo trackId={referendum.track} />}
            </div>

            {isDetailsLoading && (
              <div className="flex justify-center items-center min-h-32">
                <Loader color="primary" size={25} />
              </div>
            )}

            {!isDetailsLoading && description && <Markdown>{description}</Markdown>}
          </Plate>
        </div>

        <div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">
          <DetailsCard title={t('governance.referendum.votingStatus')}>
            <VotingStatus
              referendum={referendum}
              approvalThreshold={approvalThreshold}
              supportThreshold={supportThreshold}
              asset={asset}
            />
          </DetailsCard>
        </div>
      </div>
    </BaseModal>
  );
};
