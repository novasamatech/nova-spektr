import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { type IconNames } from '@/shared/ui';
import { getTransactionType } from '@/entities/transaction';
import { multisigOperationSDK } from '@/sdk/multisig-operation';

import { PayeeOperationDetails } from './components/PayeeOperationDetails';
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

multisigOperationSDK(stakingOperationDetailFeature, {
  icon(transaction) {
    const type = getTransactionType(transaction?.method, transaction?.section);
    if (type) {
      return getOperationIcon(type);
    }
  },
  details({ transaction }) {
    const transactionType = getTransactionType(transaction?.method, transaction?.section);
    if (!transactionType) return null;

    const shouldRenderPeyee = [
      TransactionType.BOND,
      TransactionType.STAKE_MORE,
      TransactionType.UNSTAKE,
      TransactionType.RESTAKE,
      TransactionType.REDEEM,
    ].includes(transactionType);

    const shouldRenderValidators = [TransactionType.BOND, TransactionType.NOMINATE].includes(transactionType);

    return (
      <>
        {shouldRenderPeyee && <PayeeOperationDetails operation={transaction} />}
        {shouldRenderValidators && <ValidatorsOperationDetails operation={transaction} />}
      </>
    );
  },
});
