import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  validate as basketValidate,
  confirmDetailsSlot,
  confirmTitleSlot,
  operationTitleSlot,
} from '@/features/basket-operations';
import { FellowshipVotingConfirmation } from '@/features/operations/OperationsConfirm';
import { FellowshipOperationTitle } from '../components/FellowshipOperationTitle';

import { confirm } from './confirm';
import { validate } from './validation';

export const fellowshipBasketOperationFeature = createFeature({
  name: 'fellowship/basket-operations',
});

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: 'operations.titles.nominate',
  };

  return Title[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: 'operations.modalTitles.startStakingOn',
  };

  return Title[transaction.type];
};

const getOperationIcon = (transaction: Transaction): IconNames | undefined => {
  const Icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.COLLECTIVE_VOTE]: 'voteMst',
  };

  return Icon[transaction.type];
};

fellowshipBasketOperationFeature.inject(operationTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  useGate(validate.gates.flow, { id: operation.id, operation, feeMap: {} });
  const pendingTxs = useUnit(validate.$pendingTxs);

  const title = getOperationTitle(transaction);
  const icon = getOperationIcon(transaction);

  if (title && icon) {
    return (
      <FellowshipOperationTitle
        title={t(title)}
        icon={icon}
        chainId={transaction.chainId}
        validating={pendingTxs.includes(operation.id)}
        errorText={operation.error?.message}
        error={operation.error}
      />
    );
  }

  return null;
});

fellowshipBasketOperationFeature.inject(confirmTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = basketOperationsService.getCoreTx(operation);

  const title = getModalTitle(transaction);

  if (title) {
    return (
      <OperationTitle
        className="m-3 justify-center"
        title={t('operations.modalTitles.vote')}
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
