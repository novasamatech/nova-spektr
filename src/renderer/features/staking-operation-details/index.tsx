import { t } from 'i18next';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { useI18n } from '@/shared/i18n';
import { type IconNames } from '@/shared/ui';
import { TransactionTitle, findCoreTransaction } from '@/entities/transaction';
import { multisigOperationsSDK } from '@/sdk/multisig-operations';

import { PayeeOperationDetails } from './components/PayeeOperationDetails';
import { StakingOperationTitle } from './components/StakingOperationTitle';
import { ValidatorsOperationDetails } from './components/ValidatorsOperationDetails';

export const stakingOperationDetailFeature = createFeature({
  name: 'staking/operation-details',
});

const getOperationTitle = (transactionType: TransactionType): string | undefined => {
  const Title: { [key in TransactionType]?: string } = {
    [TransactionType.BOND]: t('operations.titles.startStaking'),
    [TransactionType.NOMINATE]: t('operations.titles.nominate'),
    [TransactionType.STAKE_MORE]: t('operations.titles.stakeMore'),
    [TransactionType.REDEEM]: t('operations.titles.redeem'),
    [TransactionType.RESTAKE]: t('operations.titles.restake'),
    [TransactionType.DESTINATION]: t('operations.titles.destination'),
    [TransactionType.UNSTAKE]: t('operations.titles.unstake'),
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

multisigOperationsSDK(stakingOperationDetailFeature, {
  icon({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const icon = transaction?.type && getOperationIcon(transaction.type);
    if (icon) {
      return icon;
    }
  },
  title({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);
    if (title) {
      return <StakingOperationTitle operation={operation} title={title} />;
    }
  },
  logTitle({ operation, showCoreTransaction }) {
    const { t } = useI18n();
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;
    const title = transaction?.type && getOperationTitle(transaction.type);
    if (title) {
      return <TransactionTitle className="overflow-hidden" title={t(title || '')} />;
    }
  },
  details({ operation, showCoreTransaction }) {
    const transaction = showCoreTransaction ? findCoreTransaction(operation.transaction) : operation.transaction;

    if (
      transaction?.type &&
      [
        TransactionType.BOND,
        TransactionType.STAKE_MORE,
        TransactionType.UNSTAKE,
        TransactionType.RESTAKE,
        TransactionType.REDEEM,
      ].includes(transaction.type)
    ) {
      return <PayeeOperationDetails operation={operation} />;
    }

    if (transaction?.type && [TransactionType.BOND, TransactionType.NOMINATE].includes(transaction.type)) {
      return <ValidatorsOperationDetails operation={operation} />;
    }

    return null;
  },
});
