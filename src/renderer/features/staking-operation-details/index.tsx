import { type ReactNode } from 'react';

import { TransactionType } from '@/shared/core';
import { createFeature } from '@/shared/feature';
import { type IconNames } from '@/shared/ui';
import { getTransactionType, types } from '@/entities/transaction';
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
  icon({ section, method }) {
    const type = getTransactionType(method, section);
    if (type) {
      return getOperationIcon(type);
    }
  },
  title({ section, method }) {
    const type = getTransactionType(method, section);
    if (type) {
      return getOperationTitle(type);
    }
  },
  additionalInfo() {
    return null;
  },
  details({ transaction, chainId }) {
    const transactionType = getTransactionType(transaction?.method, transaction?.section);
    if (!transactionType) return null;

    const nodes: ReactNode[] = [];

    if (
      types.isStakingBondTransaction(transaction) ||
      types.isStakingBondExtraTransaction(transaction) ||
      types.isStakingUnbondTransaction(transaction) ||
      types.isStakingRebondTransaction(transaction) ||
      types.isStakingWithdrawUnbondedTransaction(transaction)
    ) {
      nodes.push(<PayeeOperationDetails key="payee" transaction={transaction} chainId={chainId} />);
    }

    if (types.isStakingBondTransaction(transaction) || types.isStakingNominateTransaction(transaction)) {
      nodes.push(<ValidatorsOperationDetails key="validators" transaction={transaction} chainId={chainId} />);
    }

    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <>{nodes}</>;
  },
});
