import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { HeaderTitleText, Loader } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { SignButton } from '@/entities/operations';
import { type BasketTransaction } from '@/aggregates/basket-operations';
import { OperationSign, OperationSubmit } from '@/features/operations';
import { ConfirmSlider } from '@/features/operations/OperationsConfirm';
import { signOperations } from '../model/sign';
import { validation } from '../model/validation';
import { signOperationsUtils } from '../service/sign-operations-utils';
import { Step } from '../types';

export const basketTransactionConfirmTitleSlot = createSlot<{ transaction: BasketTransaction }>();
export const basketTransactionConfirmDetailsSlot = createSlot<{ transaction: BasketTransaction }>();

export const SignTransactionsModal = () => {
  const { t } = useI18n();

  const transactions = useUnit(signOperations.$transactions);
  const step = useUnit(signOperations.$step);
  const isModalOpen = useUnit(signOperations.$isModalOpen);
  const validationResults = useUnit(validation.$validatingResults);
  const validationPending = useUnit(validation.$pending);

  if (signOperationsUtils.isSubmitStep(step)) {
    return <OperationSubmit isOpen={isModalOpen} onClose={() => signOperations.finishFlow()} />;
  }

  const pending = transactions.some(transaction => {
    return validationPending[transaction.id] ?? true;
  });

  const canSign = transactions.every(transaction => {
    const v = validationResults[transaction.id];
    return v && v.length === 0;
  });

  return (
    <Modal size="fit" isOpen={isModalOpen} onToggle={() => signOperations.finishFlow()}>
      <Modal.Title close>
        <HeaderTitleText>{t('basket.signOperations.title', { transactions: transactions?.length })}</HeaderTitleText>
      </Modal.Title>
      <Modal.Content disableScroll>
        {signOperationsUtils.isConfirmStep(step) && (
          <ConfirmSlider
            count={transactions.length}
            footer={
              <Box direction="row" verticalAlign="center" gap={4}>
                {pending && <Loader color="primary" size={24} />}
                <SignButton
                  isDefault
                  type={WalletType.POLKADOT_VAULT}
                  disabled={!canSign || pending}
                  onClick={signOperations.confirm}
                />
              </Box>
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
          <OperationSign onGoBack={() => signOperations.changeStep(Step.CONFIRM)} />
        )}
      </Modal.Content>
    </Modal>
  );
};
