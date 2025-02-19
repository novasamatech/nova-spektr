import { useGate, useUnit } from 'effector-react';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { salaryService, votingService } from '@/domains/collectives';
import { OperationTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import {
  FellowshipSalaryPayoutConfirmation,
  FellowshipSalaryRequestConfirmation,
  FellowshipSetActiveConfirmation,
  FellowshipSubmitEvidenceConfirmation,
  FellowshipVotingConfirmation,
} from '@/features/operations/OperationsConfirm';

import { confirm } from './model/confirm';
import { fellowshipBasketFeature } from './model/feature';

export { fellowshipBasketFeature };

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
    [TransactionType.COLLECTIVE_SALARY_INDUCT]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'unknownMst',
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'unknownMst',
  };

  return Icon[transaction.type];
};

basketSDK(fellowshipBasketFeature, {
  operationTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);

    const title = getOperationTitle(tx);
    const icon = getOperationIcon(tx);

    if (title && icon) {
      return <TransactionTitle className="flex-1 overflow-hidden" title={t(title)} icon={icon} />;
    }

    return null;
  },
  transactionConfirmTitle({ transaction }) {
    const { t } = useI18n();
    const input = useUnit(fellowshipBasketFeature.input);

    if (nullable(input)) return null;

    const tx = basketOperationsService.getCoreTx(transaction);
    const chain = input.chains[tx.chainId];
    if (nullable(chain)) return null;
    const asset = chain.assets.at(0);
    if (nullable(asset)) return null;

    const title = getModalTitle(tx);

    if (title) {
      return <OperationTitle className="justify-center" title={t('fellowship.voting.title')} chainId={tx.chainId} />;
    }

    return null;
  },
  transactionConfirmDetails({ transaction }) {
    useGate(confirm.flow, transaction);

    const tx = basketOperationsService.getCoreTx(transaction);

    if (votingService.isVotingTransaction(tx)) {
      return <FellowshipVotingConfirmation id={transaction.id} hideSignButton />;
    }

    if (tx.type === TransactionType.COLLECTIVE_SET_ACTIVE) {
      return <FellowshipSetActiveConfirmation id={transaction.id} hideSignButton />;
    }

    if (salaryService.isSalaryInductTransaction(tx)) {
      return <FellowshipSalaryRequestConfirmation id={transaction.id} hideSignButton />;
    }

    if (salaryService.isSalaryRequestTransaction(tx)) {
      return <FellowshipSalaryRequestConfirmation id={transaction.id} hideSignButton />;
    }

    if (salaryService.isSalaryPayoutTransaction(tx)) {
      return <FellowshipSalaryPayoutConfirmation id={transaction.id} hideSignButton />;
    }

    if (tx.type === TransactionType.COLLECTIVE_SUBMIT_EVIDENCE) {
      return <FellowshipSubmitEvidenceConfirmation id={transaction.id} hideSignButton />;
    }

    return null;
  },
  validation(result, { transaction }) {
    if (
      votingService.isVotingTransaction(transaction.coreTx) ||
      salaryService.isSalaryInductTransaction(transaction.coreTx) ||
      salaryService.isSalaryRequestTransaction(transaction.coreTx) ||
      salaryService.isSalaryPayoutTransaction(transaction.coreTx) ||
      transaction.coreTx.type === TransactionType.COLLECTIVE_SET_ACTIVE ||
      transaction.coreTx.type === TransactionType.COLLECTIVE_SUBMIT_EVIDENCE
    ) {
      return result;
    }

    return result;
  },
});
