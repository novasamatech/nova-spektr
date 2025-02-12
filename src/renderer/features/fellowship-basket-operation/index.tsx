import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { OperationTitle } from '@/entities/chain';
import { basketOperationsService } from '@/aggregates/basket-operations';
import {
  validate as basketValidate,
  confirmDetailsSlot,
  confirmTitleSlot,
  operationTitleSlot,
} from '@/features/basket-operations';
import {
  FellowshipSalaryPayoutConfirmation,
  FellowshipSalaryRequestConfirmation,
  FellowshipSetActiveConfirmation,
  FellowshipSubmitEvidenceConfirmation,
  FellowshipVotingConfirmation,
} from '@/features/operations/OperationsConfirm';

import { FellowshipOperationTitle } from './components/FellowshipOperationTitle';
import { confirm } from './model/confirm';
import { fellowshipBasketOperationFeature } from './model/feature';
import { validate } from './model/validation';

export { fellowshipBasketOperationFeature };

const getOperationTitle = (transaction: Transaction) => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: 'fellowship.voting.title',
    [TransactionType.COLLECTIVE_SET_ACTIVE]: 'fellowship.profile.setActive.title',
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'fellowship.salary.salaryRequest',
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'fellowship.salary.salaryPayout',
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'fellowship.salary.promotionTitle',
  };

  return transaction.type in title ? title[transaction.type] : null;
};

const getModalTitle = (transaction: Transaction) => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: 'fellowship.voting.title',
    [TransactionType.COLLECTIVE_SET_ACTIVE]: 'fellowship.profile.setActive.title',
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'fellowship.salary.salaryRequest',
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'fellowship.salary.salaryPayout',
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'fellowship.salary.promotionTitle',
  };

  return transaction.type in title ? title[transaction.type] : null;
};

const getOperationIcon = (transaction: Transaction): IconNames | undefined => {
  const Icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.COLLECTIVE_VOTE]: 'voteMst',
    [TransactionType.COLLECTIVE_SET_ACTIVE]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'unknownMst',
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'unknownMst',
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
  const input = useUnit(fellowshipBasketOperationFeature.input);

  if (nullable(input)) return null;

  const transaction = basketOperationsService.getCoreTx(operation);
  const chain = input.chains[transaction.chainId];
  if (nullable(chain)) return null;
  const asset = chain.assets.at(0);
  if (nullable(asset)) return null;

  const title = getModalTitle(transaction);

  if (title) {
    return (
      <OperationTitle
        className="justify-center"
        title={t('fellowship.voting.title')}
        chainId={operation.coreTx.chainId}
      />
    );
  }

  return null;
});

fellowshipBasketOperationFeature.inject(confirmDetailsSlot, ({ operation }) => {
  useGate(confirm.flow, operation);

  const transaction = basketOperationsService.getCoreTx(operation);

  if (transaction.type === TransactionType.COLLECTIVE_VOTE) {
    return <FellowshipVotingConfirmation id={operation.id} hideSignButton />;
  }

  if (transaction.type === TransactionType.COLLECTIVE_SET_ACTIVE) {
    return <FellowshipSetActiveConfirmation id={operation.id} hideSignButton />;
  }

  if (transaction.type === TransactionType.COLLECTIVE_SALARY_REQUEST) {
    return <FellowshipSalaryRequestConfirmation id={operation.id} hideSignButton />;
  }

  if (transaction.type === TransactionType.COLLECTIVE_SALARY_PAYOUT) {
    return <FellowshipSalaryPayoutConfirmation id={operation.id} hideSignButton />;
  }

  if (transaction.type === TransactionType.COLLECTIVE_SUBMIT_EVIDENCE) {
    return <FellowshipSubmitEvidenceConfirmation id={operation.id} hideSignButton />;
  }

  return null;
});

fellowshipBasketOperationFeature.inject(basketValidate.validationAsyncPipeline, validOperations => {
  const invalidTxs = useUnit(validate.$invalidTxs);

  return [...validOperations, ...invalidTxs.keys()];
});
