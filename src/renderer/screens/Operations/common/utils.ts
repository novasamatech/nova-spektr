import { IconNames } from '@renderer/components/ui/Icon/data';
import { Transaction, TransactionType } from '@renderer/domain/transaction';

export const getTransactionType = (transaction?: Transaction): TransactionType | undefined => {
  if (transaction?.type === TransactionType.BATCH_ALL) {
    return (transaction.args.transactions[0] as Transaction).type;
  }

  return transaction?.type;
};

const TransactionTitles: Record<TransactionType, string> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.ORML_TRANSFER]: 'operations.titles.transfer',
  [TransactionType.TRANSFER]: 'operations.titles.transfer',
  // Staking
  [TransactionType.BOND]: 'operations.titles.startStaking',
  [TransactionType.NOMINATE]: 'operations.titles.nominate',
  [TransactionType.STAKE_MORE]: 'operations.titles.stakeMore',
  [TransactionType.REDEEM]: 'operations.titles.redeem',
  [TransactionType.RESTAKE]: 'operations.titles.restake',
  [TransactionType.DESTINATION]: 'operations.titles.destination',
  [TransactionType.UNSTAKE]: 'operations.titles.unstake',
  // Technical
  [TransactionType.CHILL]: 'operations.titles.unknown',
  [TransactionType.BATCH_ALL]: 'operations.titles.unknown',
};

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'staking',
  [TransactionType.ORML_TRANSFER]: 'staking',
  [TransactionType.TRANSFER]: 'staking',
  // Staking
  [TransactionType.BOND]: 'staking',
  [TransactionType.NOMINATE]: 'staking',
  [TransactionType.STAKE_MORE]: 'staking',
  [TransactionType.REDEEM]: 'staking',
  [TransactionType.RESTAKE]: 'staking',
  [TransactionType.DESTINATION]: 'staking',
  [TransactionType.UNSTAKE]: 'staking',
  // Technical
  [TransactionType.CHILL]: 'staking',
  [TransactionType.BATCH_ALL]: 'staking',
};

export const getTransactionTitle = (transaction?: Transaction): string => {
  const transactionType = getTransactionType(transaction);

  if (!transactionType) return 'operations.titles.unknown';

  return TransactionTitles[transactionType];
};

export const getIconName = (transaction?: Transaction): IconNames => {
  const transactionType = getTransactionType(transaction);

  if (!transactionType) return 'question';

  return TransactionIcons[transactionType];
};
