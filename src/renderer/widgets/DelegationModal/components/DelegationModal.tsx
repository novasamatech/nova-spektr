import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { networkSelectorModel } from '@/features/governance';
import { delegateModel } from '@/widgets/DelegateModal/model/delegate-model';
import { Delegate } from '@/widgets/DelegateModal/ui/Delegate';
import { delegationModel } from '../model/delegation-model';

import { DelegationList } from './DelegationList';

export const DelegationModal = () => {
  const { t } = useI18n();

  const step = useUnit(delegationModel.$step);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), delegationModel.output.flowFinished);

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal h-[738px] bg-white"
      contentClass="min-h-0 h-full w-full bg-main-app-background py-4"
      isOpen={isModalOpen}
      title={chain && <OperationTitle title={t('governance.addDelegation.title')} chainId={chain.chainId} />}
      onClose={closeModal}
    >
      <DelegationList onClick={delegateModel.events.flowStarted} />

      <Delegate />
    </BaseModal>
  );
};
