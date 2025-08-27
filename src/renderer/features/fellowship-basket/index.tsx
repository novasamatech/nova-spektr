import { useGate, useUnit } from 'effector-react';
import { t } from 'i18next';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { type IconNames } from '@/shared/ui';
import { salaryService, votingService } from '@/domains/collectives';
import { ChainTitle, OperationTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import {
  FellowshipSalaryInductConfirmation,
  FellowshipSalaryPayoutConfirmation,
  FellowshipSalaryRequestConfirmation,
  FellowshipSetActiveConfirmation,
  FellowshipSubmitEvidenceConfirmation,
  FellowshipVotingConfirmation,
} from '@/features/operations/OperationsConfirm';

import { confirm } from './model/confirm';
import { fellowshipBasketFeature } from './model/feature';

export { fellowshipBasketFeature };

const getModalTitle = (transaction: Transaction) => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: t('fellowship.voting.title'),
    [TransactionType.COLLECTIVE_SET_ACTIVE]: t('fellowship.profile.setActive.title'),
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: t('fellowship.salary.salaryRequest'),
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: t('fellowship.salary.salaryPayout'),
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: t('fellowship.salary.promotionTitle'),
    [TransactionType.COLLECTIVE_SALARY_INDUCT]: t('fellowship.salary.salaryInduct'),
  };

  return transaction.type in title ? title[transaction.type] : null;
};

const getRecordTitle = (transaction: Transaction) => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.COLLECTIVE_VOTE]: t('fellowship.basket.vote'),
    [TransactionType.COLLECTIVE_SET_ACTIVE]: t('fellowship.basket.setActive'),
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: t('fellowship.basket.salaryRequest'),
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: t('fellowship.basket.salaryPayout'),
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: t('fellowship.basket.submitEvidence'),
    [TransactionType.COLLECTIVE_SALARY_INDUCT]: t('fellowship.basket.salaryInduct'),
  };

  return transaction.type in title ? title[transaction.type] : null;
};

const getIcon = (transaction: Transaction): IconNames | undefined => {
  const icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.COLLECTIVE_VOTE]: 'voteMst',
    [TransactionType.COLLECTIVE_SET_ACTIVE]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_INDUCT]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'unknownMst',
    [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'unknownMst',
    [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'unknownMst',
  };

  return icon[transaction.type];
};

basketSDK(fellowshipBasketFeature, {
  operationTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);

    const title = getRecordTitle(tx);
    const icon = getIcon(tx);

    if (title && icon) {
      return (
        <>
          <TransactionTitle className="flex-1 overflow-hidden" title={t(title)} icon={icon} />
          <ChainTitle chainId={transaction.coreTx.chainId} />
        </>
      );
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
      return <OperationTitle className="justify-center" title={t(title)} chainId={tx.chainId} />;
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
      return <FellowshipSalaryInductConfirmation id={transaction.id} hideSignButton />;
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
