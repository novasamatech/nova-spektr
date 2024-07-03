import { useGate, useStoreMap } from 'effector-react';

import { type Chain, type Referendum } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BaseModal, Plate } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { governanceModel } from '@entities/governance';
import { referendumDetailsModel } from '../model/referendum-details-model';
import { referendumListModel } from '../../ReferendumList/model/referendum-list-model';
import { ProposalDescription } from './ProposalDescription';
import { VotingStatus } from './VotingStatus';
import { DetailsCard } from './DetailsCard';

type Props = {
  chain: Chain;
  referendum: Referendum;
  onClose: VoidFunction;
};

export const ReferendumDetails = ({ chain, referendum, onClose }: Props) => {
  useGate(referendumDetailsModel.gates.flow, { chain, referendum });

  const { t } = useI18n();

  const title = useStoreMap({
    store: referendumListModel.$referendumsTitles,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const votingAsset = useStoreMap({
    store: referendumDetailsModel.$votingAssets,
    keys: [chain.chainId],
    fn: (x, [chainId]) => x[chainId],
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
        <Plate className="min-h-0 min-w-80 basis-[530px] p-6 shadow-card-shadow border-filter-border">
          <ProposalDescription chainId={chain.chainId} referendum={referendum} />
        </Plate>

        <div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">
          <DetailsCard title={t('governance.referendum.votingStatus')}>
            <VotingStatus
              referendum={referendum}
              approvalThreshold={approvalThreshold}
              supportThreshold={supportThreshold}
              asset={votingAsset}
            />
          </DetailsCard>
        </div>
      </div>
    </BaseModal>
  );
};
