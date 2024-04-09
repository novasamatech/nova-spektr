import { useUnit } from 'effector-react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import { OperationSign, OperationSubmit } from '@features/operations';
import { PayeeForm } from './PayeeForm';
import { Confirmation } from './Confirmation';
import { payeeUtils } from '../lib/payee-utils';
import { payeeModel } from '../model/payee-model';
import { Step } from '../lib/types';

export const Payee = () => {
  const { t } = useI18n();

  const step = useUnit(payeeModel.$step);
  const walletData = useUnit(payeeModel.$walletData);

  const [isModalOpen, closeModal] = useModalClose(!payeeUtils.isNoneStep(step), payeeModel.output.flowFinished);

  if (!walletData) return null;

  if (payeeUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelClass="w-max"
      isOpen={isModalOpen}
      title={
        <OperationTitle
          title={t('staking.destination.title', { asset: walletData.chain.assets[0].symbol })}
          chainId={walletData.chain.chainId}
        />
      }
      onClose={closeModal}
    >
      {payeeUtils.isInitStep(step) && <PayeeForm onGoBack={closeModal} />}
      {payeeUtils.isConfirmStep(step) && <Confirmation onGoBack={() => payeeModel.events.stepChanged(Step.INIT)} />}
      {payeeUtils.isSignStep(step) && <OperationSign onGoBack={() => payeeModel.events.stepChanged(Step.CONFIRM)} />}
    </BaseModal>
  );
};
