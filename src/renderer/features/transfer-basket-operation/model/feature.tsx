import { useGate, useUnit } from 'effector-react';

import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { OperationTitle, getOperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { isTransferTransaction, isXcmTransaction } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  validate as basketValidate,
  confirmDetailsSlot,
  confirmTitleSlot,
  operationTitleSlot,
} from '@/features/basket-operations';
import { TransferConfirm } from '@/features/operations/OperationsConfirm';
import { TransferOperationTitle } from '../components/TransferOperationTitle';
import { XcmTransferOperationTitle } from '../components/XcmTransferOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const transferBasketOperationFeature = createFeature({
  name: 'transfer/basket-operations',
});

transferBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (isTransferTransaction(transaction)) {
    return (
      <TransferOperationTitle
        coreTx={transaction}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
        onClick={() => {}}
        onTxRemoved={() => {}}
      />
    );
  }

  if (isXcmTransaction(transaction)) {
    return (
      <XcmTransferOperationTitle
        coreTx={transaction}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
        onClick={() => {}}
        onTxRemoved={() => {}}
      />
    );
  }

  return null;
});

transferBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.coreTx.chainId];
  const transaction = basketOperationsService.getCoreTx(operation);

  if (!isTransferTransaction(transaction) && !isXcmTransaction(transaction)) return null;

  const { title, params } = getOperationTitle(operation, chain);

  return (
    <OperationTitle
      className="m-3 justify-center"
      title={`${t(title, { ...params })}`}
      chainId={operation.coreTx.chainId}
    />
  );
});

transferBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (!isTransferTransaction(transaction) && !isXcmTransaction(transaction)) return null;

  return <TransferConfirm id={operation.id} hideSignButton />;
});

transferBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, (validOperations) => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
