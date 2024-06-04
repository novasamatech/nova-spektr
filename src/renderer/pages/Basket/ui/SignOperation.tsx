import { useUnit } from 'effector-react';
import { ReactNode } from 'react';

import { BaseModal } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { OperationTitle } from '@entities/chain';
import { useI18n } from '@app/providers';
import type { BasketTransaction } from '@shared/core';
import { OperationSubmit } from '@features/operations';
import { signOperationsUtils } from '../lib/sign-operations-utils';
import { signOperationsModel } from '../model/sign-operations-model';
import { TransferConfirm } from '@features/operations/OperationsConfirm';
import { getOperationTitle } from '../lib/operation-title';

export const SignOperation = () => {
  const { t } = useI18n();

  const step = useUnit(signOperationsModel.$step);
  const transactions = useUnit(signOperationsModel.$transactions);

  console.log('xcm', step);

  const [isModalOpen, closeModal] = useModalClose(
    !signOperationsUtils.isNoneStep(step),
    signOperationsModel.output.flowFinished,
  );

  if (signOperationsUtils.isSubmitStep(step)) return <OperationSubmit isOpen={isModalOpen} onClose={closeModal} />;

  const getModalTitle = (basketTransaction: BasketTransaction): String | ReactNode => {
    const { title, params } = getOperationTitle(basketTransaction);

    return <OperationTitle title={`${t(title, params)}`} chainId={basketTransaction.coreTx.chainId} />;
  };

  return (
    <BaseModal
      closeButton
      contentClass=""
      isOpen={isModalOpen}
      title={transactions.length && getModalTitle(transactions[0])}
      onClose={closeModal}
    >
      {transactions.length > 0 && signOperationsUtils.isConfirmStep(step) && (
        <TransferConfirm onGoBack={() => signOperationsModel.output.flowFinished()} />
      )}
    </BaseModal>
  );
};
