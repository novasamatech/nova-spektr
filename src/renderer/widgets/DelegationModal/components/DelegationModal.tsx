import { useUnit } from 'effector-react';

import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { Modal } from '@/shared/ui-kit';
import { OperationTitle } from '@/entities/chain';
import { networkSelectorModel } from '@/features/governance';
import { delegateDetailsModel } from '@/widgets/DelegateDetails';
import { delegationModel } from '../model/delegation-model';

import { AddCustomDelegationModel } from './AddCustomDelegationModal';
import { DelegationList } from './DelegationList';

export const DelegationModal = () => {
  const { t } = useI18n();

  const step = useUnit(delegationModel.$step);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), delegationModel.output.flowFinished);

  return (
    <Modal isOpen={isModalOpen} size="md" height="full" onToggle={closeModal}>
      <Modal.Title close>
        {chain && <OperationTitle title={t('governance.addDelegation.title')} chainId={chain.chainId} />}
      </Modal.Title>
      <Modal.Content>
        <DelegationList
          onClick={delegateDetailsModel.events.flowStarted}
          onAddCustomClick={delegationModel.events.openCustomModal}
        />

        <AddCustomDelegationModel />
      </Modal.Content>
    </Modal>
  );
};
