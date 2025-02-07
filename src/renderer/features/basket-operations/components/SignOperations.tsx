import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useModalClose } from '@/shared/lib/hooks';
import { BaseModal, HeaderTitleText } from '@/shared/ui';
import { SignButton } from '@/entities/operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider } from '@/features/operations/OperationsConfirm';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperations } from '../model/sign';
import { Step } from '../types';

import { OperationConfirm } from './OperationConfirm';

export const SignOperations = () => {
  const { t } = useI18n();

  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);

  const [isModalOpen, closeModal] = useModalClose(
    !signOperationsUtils.isNoneStep(step),
    signOperations.output.flowFinished,
  );

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;
  }

  return (
    <BaseModal
      closeButton
      contentClass=""
      panelStyle={
        // Change panel class doesn't work
        {
          ...(signOperationsUtils.isConfirmStep(step) && {
            //eslint-disable-next-line i18next/no-literal-string
            width: `478px`,
          }),
        }
      }
      headerClass="py-3 pl-5 pr-3"
      isOpen={isModalOpen}
      title={
        <HeaderTitleText>{t('basket.signOperations.title', { transactions: transactions?.length })}</HeaderTitleText>
      }
      onClose={() => closeModal()}
    >
      {signOperationsUtils.isConfirmStep(step) && (
        <ConfirmSlider
          count={transactions.length}
          footer={
            <SignButton isDefault type={WalletType.POLKADOT_VAULT} onClick={signOperations.events.txsConfirmed} />
          }
        >
          {transactions.map((t) => (
            <ConfirmSlider.Item key={t.id}>
              <OperationConfirm operation={t} />
            </ConfirmSlider.Item>
          ))}
        </ConfirmSlider>
      )}

      {signOperationsUtils.isSignStep(step) && (
        <OperationSign onGoBack={() => signOperations.events.stepChanged(Step.CONFIRM)} />
      )}
    </BaseModal>
  );
};
