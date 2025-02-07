import { useGate, useUnit } from 'effector-react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { OperationTitle, getOperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  validate as basketValidate,
  confirmDetailsSlot,
  confirmTitleSlot,
  operationTitleSlot,
} from '@/features/basket-operations';
import { FellowshipVotingConfirmation } from '@/features/operations/OperationsConfirm';
import { FellowshipOperationTitle } from '../components/GovernanceOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const fellowshipBasketOperationFeature = createFeature({
  name: 'fellowship/basket-operations',
});

fellowshipBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  if (transaction?.type && [TransactionType.COLLECTIVE_VOTE].includes(transaction.type)) {
    return (
      <FellowshipOperationTitle
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

fellowshipBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const chains = useUnit(networkModel.$chains);
  const chain = chains[operation.coreTx.chainId];
  const transaction = basketOperationsService.getCoreTx(operation);

  const { title, params } = getOperationTitle(operation, chain);

  if (
    transaction?.type &&
    [
      TransactionType.DELEGATE,
      TransactionType.EDIT_DELEGATION,
      TransactionType.UNDELEGATE,
      TransactionType.UNLOCK,
      TransactionType.VOTE,
      TransactionType.REVOTE,
      TransactionType.REMOVE_VOTE,
    ].includes(transaction.type)
  ) {
    return (
      <OperationTitle
        className="m-3 justify-center"
        title={`${t(title, { ...params })}`}
        chainId={operation.coreTx.chainId}
      />
    );
  }

  return null;
});

fellowshipBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (transaction.type === TransactionType.COLLECTIVE_VOTE)
    return <FellowshipVotingConfirmation id={operation.id} hideSignButton />;

  return null;
});

fellowshipBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, validOperations => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
