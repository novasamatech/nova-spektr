import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { OperationTitle } from '@/entities/chain';
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

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: 'operations.titles.unlock',
    [TransactionType.VOTE]: 'operations.titles.vote',
    [TransactionType.REVOTE]: 'operations.titles.revote',
    [TransactionType.REMOVE_VOTE]: 'operations.titles.removeVote',
    [TransactionType.DELEGATE]: 'operations.titles.delegate',
    [TransactionType.UNDELEGATE]: 'operations.titles.undelegate',
    [TransactionType.EDIT_DELEGATION]: 'operations.titles.editDelegation',
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: 'operations.modalTitles.unlockOn',
    [TransactionType.DELEGATE]: 'operations.modalTitles.delegateOn',
    [TransactionType.EDIT_DELEGATION]: 'operations.modalTitles.editDelegationOn',
    [TransactionType.UNDELEGATE]: 'operations.modalTitles.undelegateOn',
    [TransactionType.VOTE]: 'operations.modalTitles.vote',
    [TransactionType.REVOTE]: 'operations.modalTitles.revote',
    [TransactionType.REMOVE_VOTE]: 'operations.modalTitles.removeVote',
  };

  return Title[transaction.type];
};

governanceBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  const title = getOperationTitle(transaction);

  if (title) {
    return (
      <GovernanceOperationTitle
        title={t(title)}
        operation={operation}
        chainId={transaction.chainId}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
      />
    );
  }

  return null;
});

governanceBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);
  const title = getModalTitle(transaction);

  if (title)
    return <OperationTitle className="m-3 justify-center" title={t(title)} chainId={operation.coreTx.chainId} />;

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
