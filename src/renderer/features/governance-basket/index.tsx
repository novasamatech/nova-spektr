import { useGate } from 'effector-react';
import { t } from 'i18next';

import { type Transaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { ChainTitle, OperationTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { basketOperationsService } from '@/aggregates/basket-operations';
import { basketSDK } from '@/sdk/basket';
import { unlockValidateModel, voteValidateModel } from '@/features/governance';
import {
  DelegateConfirmation,
  EditDelegationConfirmation,
  RemoveVoteConfirmation,
  RevokeDelegationConfirmation,
  UnlockConfirmation,
  VoteConfirmation,
} from '@/features/operations/OperationsConfirm';
import {
  delegateValidateModel,
  removeVoteValidateModel,
  revokeDelegationValidateModel,
} from '@/features/operations/OperationsValidation';

import { confirm } from './model/confirm';
import { governanceBasketFeature } from './model/feature';

export { governanceBasketFeature };

const getOperationTitle = (transaction: Transaction): string | undefined => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: t('operations.titles.unlock'),
    [TransactionType.VOTE]: t('operations.titles.vote'),
    [TransactionType.REMOVE_VOTE]: t('operations.titles.removeVote'),
    [TransactionType.DELEGATE]: t('operations.titles.delegate'),
    [TransactionType.UNDELEGATE]: t('operations.titles.undelegate'),
    [TransactionType.EDIT_DELEGATION]: t('operations.titles.editDelegation'),
  };

  return title[transaction.type];
};

const getOperationIcon = (transaction: Transaction): IconNames | undefined => {
  const icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.UNLOCK]: 'unlockMst',
    [TransactionType.VOTE]: 'voteMst',
    [TransactionType.REMOVE_VOTE]: 'retractMst',
    [TransactionType.DELEGATE]: 'delegateMst',
    [TransactionType.UNDELEGATE]: 'undelegateMst',
    [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  };

  return icon[transaction.type];
};

const getModalTitle = (transaction: Transaction): string | undefined => {
  const title: { [key in TransactionType]?: string } = {
    [TransactionType.UNLOCK]: t('operations.modalTitles.unlockOn'),
    [TransactionType.DELEGATE]: t('operations.modalTitles.delegateOn'),
    [TransactionType.EDIT_DELEGATION]: t('operations.modalTitles.editDelegationOn'),
    [TransactionType.UNDELEGATE]: t('operations.modalTitles.undelegateOn'),
    [TransactionType.VOTE]: t('operations.modalTitles.vote'),
    [TransactionType.REMOVE_VOTE]: t('operations.modalTitles.removeVote'),
  };

  return title[transaction.type];
};

basketSDK(governanceBasketFeature, {
  operationTitle({ transaction }) {
    const { t } = useI18n();
    const tx = basketOperationsService.getCoreTx(transaction);

    const title = getOperationTitle(tx);
    const icon = getOperationIcon(tx);

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
    const tx = basketOperationsService.getCoreTx(transaction);
    const title = getModalTitle(tx);

    if (title) {
      return <OperationTitle className="justify-center" title={t(title)} chainId={tx.chainId} />;
    }

    return null;
  },
  transactionConfirmDetails: ({ transaction }) => {
    useGate(confirm.flow, transaction);

    const tx = basketOperationsService.getCoreTx(transaction);

    if (tx.type === TransactionType.DELEGATE)
      return <DelegateConfirmation id={transaction.id} config={{ withFormatAmount: false }} hideSignButton />;
    if (tx.type === TransactionType.EDIT_DELEGATION)
      return <EditDelegationConfirmation id={transaction.id} config={{ withFormatAmount: false }} hideSignButton />;
    if (tx.type === TransactionType.UNDELEGATE)
      return <RevokeDelegationConfirmation id={transaction.id} config={{ withFormatAmount: false }} hideSignButton />;
    if (tx.type === TransactionType.UNLOCK) return <UnlockConfirmation id={transaction.id} hideSignButton />;
    if (tx.type === TransactionType.VOTE) return <VoteConfirmation id={transaction.id} hideSignButton />;
    if (tx.type === TransactionType.REMOVE_VOTE) return <RemoveVoteConfirmation id={transaction.id} hideSignButton />;

    return null;
  },
  validation(errors, { transaction }) {
    if (transaction.coreTx.type === TransactionType.DELEGATE) {
      return delegateValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    if (transaction.coreTx.type === TransactionType.UNDELEGATE) {
      return revokeDelegationValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    if (transaction.coreTx.type === TransactionType.VOTE) {
      return voteValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    if (transaction.coreTx.type === TransactionType.REMOVE_VOTE) {
      return removeVoteValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    if (transaction.coreTx.type === TransactionType.UNLOCK) {
      return unlockValidateModel
        .validate({ id: transaction.id, transaction: transaction.coreTx, feeMap: {} })
        .then(({ result }) => {
          return result ? errors.concat(result) : errors;
        });
    }

    // TODO implement
    if (transaction.coreTx.type === TransactionType.EDIT_DELEGATION) {
      return errors;
    }

    return errors;
  },
});
