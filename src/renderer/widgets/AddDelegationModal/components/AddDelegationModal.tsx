import { useUnit } from 'effector-react';

import { useI18n } from '@/app/providers';
import { useModalClose } from '@/shared/lib/hooks';
import { Step, isStep } from '@/shared/lib/utils';
import { BaseModal } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { networkSelectorModel } from '@/features/governance';
import { addDelegationModel } from '../model/addDelegation';

import { DelegationList } from './DelegationList';

export const AddDelegationModal = () => {
  const { t } = useI18n();

  const step = useUnit(addDelegationModel.$step);
  const chain = useUnit(networkSelectorModel.$governanceChain);

  const [isModalOpen, closeModal] = useModalClose(!isStep(step, Step.NONE), addDelegationModel.output.flowFinished);

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
      {isStep(step, Step.LIST) && <DelegationList />}
    </BaseModal>
  );
};
