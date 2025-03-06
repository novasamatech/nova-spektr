import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { operationDetailsUtils } from '@/entities/operations';
import { TransactionTitle, getTransactionType } from '@/entities/transaction';
import { logTitleSlot, operationDetailsSlot, operationTitleSlot } from '@/features/multisig-operations';

import { PayeeOperationDetails } from './components/PayeeOperationDetails';
import { StakingOperationTitle } from './components/StakingOperationTitle';
import { ValidatorsOperationDetails } from './components/ValidatorsOperationDetails';

export const stakingOperationDetailFeature = createFeature({
  name: 'staking/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: 'operations.titles.startStaking',
    [TransactionType.NOMINATE]: 'operations.titles.nominate',
    [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
    [TransactionType.REDEEM]: 'operations.titles.redeem',
    [TransactionType.RESTAKE]: 'operations.titles.restake',
    [TransactionType.DESTINATION]: 'operations.titles.destination',
    [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  };

  return Title[transactionType];
};

const getOperationIcon = (transactionType: TransactionType): IconNames | undefined => {
  const Icon: { [key in TransactionType]?: IconNames } = {
    [TransactionType.BOND]: 'startStakingMst',
    [TransactionType.NOMINATE]: 'changeValidatorsMst',
    [TransactionType.STAKE_MORE]: 'stakeMoreMst',
    [TransactionType.REDEEM]: 'redeemMst',
    [TransactionType.RESTAKE]: 'returnToStakeMst',
    [TransactionType.DESTINATION]: 'destinationMst',
    [TransactionType.UNSTAKE]: 'unstakeMst',
  };

  return Icon[transactionType];
};

stakingOperationDetailFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => {
    const transaction = operationDetailsUtils.getOperationData(operation);
    const transactionType = getTransactionType(transaction?.method, transaction?.section);

    if (
      transactionType &&
      [
        TransactionType.BOND,
        TransactionType.STAKE_MORE,
        TransactionType.UNSTAKE,
        TransactionType.RESTAKE,
        TransactionType.REDEEM,
      ].includes(transactionType)
    ) {
      return <PayeeOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 1,
});

stakingOperationDetailFeature.inject(operationDetailsSlot, {
  render: ({ operation }) => {
    const transaction = operationDetailsUtils.getOperationData(operation);
    const transactionType = getTransactionType(transaction?.method, transaction?.section);

    if (transactionType && [TransactionType.BOND, TransactionType.NOMINATE].includes(transactionType)) {
      return <ValidatorsOperationDetails operation={operation} />;
    }

    return null;
  },
  order: 2,
});

stakingOperationDetailFeature.inject(operationTitleSlot, ({ operation }) => {
  const transaction = operationDetailsUtils.getOperationData(operation);
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  const title = transactionType && getOperationTitle(transactionType);
  const icon = transactionType && getOperationIcon(transactionType);

  if (title) {
    return <StakingOperationTitle operation={operation} title={title} icon={icon} />;
  }

  return null;
});

stakingOperationDetailFeature.inject(logTitleSlot, ({ operation }) => {
  const { t } = useI18n();
  const transaction = operationDetailsUtils.getOperationData(operation);
  const transactionType = getTransactionType(transaction?.method, transaction?.section);

  const title = transactionType && getOperationTitle(transactionType);
  const icon = transactionType && getOperationIcon(transactionType);

  if (title) {
    return <TransactionTitle className="overflow-hidden" title={t(title || '')} icon={icon} />;
  }

  return null;
});
