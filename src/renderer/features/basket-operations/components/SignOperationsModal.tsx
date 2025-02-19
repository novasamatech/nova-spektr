import { useUnit } from 'effector-react';

import { type BasketTransaction, WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { HeaderTitleText } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider } from '@/features/operations/OperationsConfirm';
import { signOperations } from '../model/sign';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

export const basketTransactionConfirmTitleSlot = createSlot<{ transaction: BasketTransaction }>();
export const basketTransactionConfirmDetailsSlot = createSlot<{ transaction: BasketTransaction }>();

export const SignOperationsModal = () => {
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
            {transactions.map(t => (
              <ConfirmSlider.Item key={t.id}>
                <Box padding={5}>
                  <Slot id={basketTransactionConfirmTitleSlot} props={{ transaction: t }} />
                </Box>
                <Slot id={basketTransactionConfirmDetailsSlot} props={{ transaction: t }} />
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
