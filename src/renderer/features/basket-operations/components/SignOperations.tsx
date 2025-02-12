import { useUnit } from 'effector-react';

import { type BasketTransaction, WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { HeaderTitleText } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider } from '@/features/operations/OperationsConfirm';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperations } from '../model/sign';
import { Step } from '../types';

export const confirmTitleSlot = createSlot<{ operation: BasketTransaction }>();
export const confirmDetailsSlot = createSlot<{ operation: BasketTransaction }>();

export const SignOperations = () => {
  const { t } = useI18n();

  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);
  const isModalOpen = useUnit(signOperations.$isModalOpen);

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={signOperations.output.flowFinished} />;
  }

  return (
    <Modal size="fit" isOpen={isModalOpen} onToggle={() => signOperations.output.flowFinished()}>
      <Modal.Title close>
        <HeaderTitleText>{t('basket.signOperations.title', { transactions: transactions?.length })}</HeaderTitleText>
      </Modal.Title>
      <Modal.Content>
        {signOperationsUtils.isConfirmStep(step) && (
          <ConfirmSlider
            count={transactions.length}
            footer={
              <SignButton isDefault type={WalletType.POLKADOT_VAULT} onClick={signOperations.events.txsConfirmed} />
            }
          >
            {transactions.map((t) => (
              <ConfirmSlider.Item key={t.id}>
                <Slot id={confirmTitleSlot} props={{ operation: t }} />
                <Slot id={confirmDetailsSlot} props={{ operation: t }} />
              </ConfirmSlider.Item>
            ))}
          </ConfirmSlider>
        )}

        {signOperationsUtils.isSignStep(step) && (
          <OperationSign onGoBack={() => signOperations.events.stepChanged(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
