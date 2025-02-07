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
import {
  DelegateConfirmation,
  EditDelegationConfirmation,
  RemoveVoteConfirmation,
  RevokeDelegationConfirmation,
  VoteConfirmation,
} from '@/features/operations/OperationsConfirm';
import { UnlockConfirmation } from '@/widgets/UnlockModal';
import { GovernanceOperationTitle } from '../components/GovernanceOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const governanceBasketOperationFeature = createFeature({
  name: 'governance/basket-operations',
});

governanceBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

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
      <GovernanceOperationTitle
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

governanceBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
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

governanceBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (transaction.type === TransactionType.DELEGATE)
    return <DelegateConfirmation id={operation.id} config={{ withFormatAmount: false }} hideSignButton />;
  if (transaction.type === TransactionType.EDIT_DELEGATION)
    return <EditDelegationConfirmation id={operation.id} config={{ withFormatAmount: false }} hideSignButton />;
  if (transaction.type === TransactionType.UNDELEGATE)
    return <RevokeDelegationConfirmation id={operation.id} config={{ withFormatAmount: false }} hideSignButton />;
  if (transaction.type === TransactionType.UNLOCK) return <UnlockConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.VOTE) return <VoteConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.REVOTE) return <VoteConfirmation id={operation.id} hideSignButton />;
  if (transaction.type === TransactionType.REMOVE_VOTE)
    return <RemoveVoteConfirmation id={operation.id} hideSignButton />;

  return null;
});

governanceBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, (validOperations) => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
