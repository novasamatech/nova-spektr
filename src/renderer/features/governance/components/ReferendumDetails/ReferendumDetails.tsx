import { useGate, useStoreMap } from 'effector-react';

import { type Chain, type Referendum } from '@shared/core';
import { pickNestedValue } from '@shared/lib/utils';
import { useI18n } from '@app/providers';
import { BaseModal, Plate } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { approveThresholdModel, supportThresholdModel } from '@entities/governance';
import { detailsAggregate } from '../../aggregates/details';
import { ProposalDescription } from './ProposalDescription';
import { VotingStatus } from './VotingStatus';
import { DetailsCard } from './DetailsCard';

type Props = {
  chain: Chain;
  referendum: Referendum;
  onClose: VoidFunction;
};

export const ReferendumDetails = ({ chain, referendum, onClose }: Props) => {
  useGate(detailsAggregate.gates.flow, { chain, referendum });

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

  const approvalThreshold = useStoreMap({
    store: approveThresholdModel.$approvalThresholds,
    keys: [chain.chainId, referendum.referendumId],
    fn: (x, [chainId, index]) => pickNestedValue(x, chainId, index),
  });

  const supportThreshold = useStoreMap({
    store: supportThresholdModel.$supportThresholds,
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
