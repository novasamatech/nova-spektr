import { DecodedTransaction, Transaction, TransactionType } from '@renderer/entities/transaction/model/transaction';
import { IconNames } from '@renderer/shared/ui/Icon/data';

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'transferMst',
  [TransactionType.ORML_TRANSFER]: 'transferMst',
  [TransactionType.TRANSFER]: 'transferMst',
  [TransactionType.MULTISIG_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'transferMst',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'transferMst',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: 'crossChain',
  [TransactionType.XCM_TELEPORT]: 'crossChain',
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: 'crossChain',
  [TransactionType.POLKADOT_XCM_TELEPORT]: 'crossChain',
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: 'crossChain',
  // Staking
  [TransactionType.BOND]: 'startStakingMst',
  [TransactionType.NOMINATE]: 'changeValidatorsMst',
  [TransactionType.STAKE_MORE]: 'stakeMoreMst',
  [TransactionType.REDEEM]: 'redeemMst',
  [TransactionType.RESTAKE]: 'returnToStakeMst',
  [TransactionType.DESTINATION]: 'destinationMst',
  [TransactionType.UNSTAKE]: 'unstakeMst',
  // Technical
  [TransactionType.CHILL]: 'unstakeMst',
  [TransactionType.BATCH_ALL]: 'unknownMst',
};

export const getIconName = (transaction?: Transaction | DecodedTransaction): IconNames => {
  if (!transaction?.type) return 'question';

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.transactions?.[0]);
  }

  return TransactionIcons[transaction.type];
};
