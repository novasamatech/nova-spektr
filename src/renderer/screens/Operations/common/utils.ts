import { IconNames } from '@renderer/components/ui/Icon/data';
import { Explorer } from '@renderer/domain/chain';
import { HexString } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { MultisigTransactionDS } from '@renderer/services/storage';

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
  [TransactionType.CHILL]: 'question',
  [TransactionType.BATCH_ALL]: 'question',
};

export const getTransactionTitle = (transaction?: Transaction): string => {
  if (!transaction?.type) return 'operations.titles.unknown';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getTransactionTitle(transaction?.args?.calls?.[0]);
  }

  return TransactionTitles[transaction.type];
};

export const getIconName = (transaction?: Transaction): IconNames => {
  if (!transaction?.type) return 'question';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.calls?.[0]);
  }

  return TransactionIcons[transaction.type];
};

export const sortByDate = ([dateA]: [string, MultisigTransactionDS[]], [dateB]: [string, MultisigTransactionDS[]]) =>
  new Date(dateA) < new Date(dateB) ? 1 : -1;

export const getMultisigExtrinsicLink = (
  callHash?: HexString,
  indexCreated?: number,
  blockCreated?: number,
  explorers?: Explorer[],
): string | undefined => {
  if (!callHash || !indexCreated || !blockCreated || !explorers) return;

  const multisigLink = explorers.find((e) => e.multisig);

  if (!multisigLink?.multisig) return;

  return multisigLink.multisig.replace('{index}', `${blockCreated}-${indexCreated}`).replace('{callHash}', callHash);
};
