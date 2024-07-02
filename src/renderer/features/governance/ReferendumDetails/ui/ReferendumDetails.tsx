import { useGate, useStoreMap, useUnit } from 'effector-react';
import { FC } from 'react';

import { type Chain, CompletedReferendum, OngoingReferendum } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BaseModal, Plate, FootnoteText, Loader, Markdown } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { governanceModel, TrackInfo } from '@entities/governance';
import { referendumDetailsModel } from '../model/referendum-details-model';
import { referendumListModel } from '../../ReferendumList/model/referendum-list-model';
import { VotingStatus } from './VotingStatus';

type Props = {
  chain: Chain;
  referendum: OngoingReferendum | CompletedReferendum;
  onClose: VoidFunction;
};

export const ReferendumDetails: FC<Props> = ({ chain, referendum, onClose }) => {
  useGate(referendumDetailsModel.input.flow, { chain, referendum });

  const { t } = useI18n();

  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);

  const offChainDetails = useStoreMap({
    store: referendumDetailsModel.$offChainDetails,
    keys: [chain.chainId, referendum.referendumId],
    fn: (details, [chainId, index]) => pickNestedValue(details, chainId, index),
  });

  const title = useStoreMap({
    store: referendumListModel.$referendumsNames,
    keys: [chain.chainId, referendum.referendumId],
    fn: (names, [chainId, index]) => pickNestedValue(names, chainId, index),
  });

  const approvalThreshold = useStoreMap({
    store: governanceModel.$approvalThresholds,
    keys: [referendum.referendumId],
    fn: (x, [index]) => (index ? x[index] : null),
  });

  const supportThreshold = useStoreMap({
    store: governanceModel.$supportThresholds,
    keys: [referendum.referendumId],
    fn: (x, [index]) => (index ? x[index] : null),
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
            <div className="flex justify-between items-center mb-4">
              <FootnoteText className="text-text-secondary">
                {t('governance.referendum.proposer', { name: 'XXX' })}
              </FootnoteText>
              {'track' in referendum && <TrackInfo trackId={referendum.track} />}
            </div>

            {isDetailsLoading && (
              <div className="flex justify-center items-center min-h-32">
                <Loader color="primary" size={25} />
              </div>
            )}

            {!isDetailsLoading && offChainDetails && <Markdown>{offChainDetails}</Markdown>}
          </Plate>
        </div>

        <div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">
          <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">
            <VotingStatus
              referendum={referendum}
              approvalThreshold={approvalThreshold}
              supportThreshold={supportThreshold}
              asset={asset}
            />
          </Plate>
        </div>
      </div>
    </BaseModal>
  );
};
