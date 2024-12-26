import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { type IconNames } from '@/shared/ui/Icon/data';

import { isEditDelegationTransaction } from './common/utils';

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'transferConfirm',
  [TransactionType.ORML_TRANSFER]: 'transferConfirm',
  [TransactionType.TRANSFER]: 'transferConfirm',
  [TransactionType.MULTISIG_AS_MULTI]: 'transferConfirm',
  [TransactionType.MULTISIG_APPROVE_AS_MULTI]: 'transferConfirm',
  [TransactionType.MULTISIG_CANCEL_AS_MULTI]: 'transferConfirm',
  // XCM
  [TransactionType.XCM_LIMITED_TRANSFER]: 'crossChainConfirm',
  [TransactionType.XCM_TELEPORT]: 'crossChainConfirm',
  [TransactionType.POLKADOT_XCM_LIMITED_TRANSFER]: 'crossChainConfirm',
  [TransactionType.POLKADOT_XCM_TELEPORT]: 'crossChainConfirm',
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: 'crossChainConfirm',
  [TransactionType.XTOKENS_TRANSFER_MULTIASSET]: 'crossChainConfirm',
  // Staking
  [TransactionType.BOND]: 'startStakingConfirm',
  [TransactionType.NOMINATE]: 'changeValidatorsConfirm',
  [TransactionType.STAKE_MORE]: 'stakeMoreConfirm',
  [TransactionType.REDEEM]: 'redeemConfirm',
  [TransactionType.RESTAKE]: 'returnToStakeConfirm',
  [TransactionType.DESTINATION]: 'destinationConfirm',
  [TransactionType.UNSTAKE]: 'unstakeConfirm',
  // Technical
  [TransactionType.CHILL]: 'unknownConfirm',
  [TransactionType.BATCH_ALL]: 'unknownConfirm',
  // Proxy
  [TransactionType.ADD_PROXY]: 'proxyConfirm',
  [TransactionType.CREATE_PURE_PROXY]: 'proxyConfirm',
  [TransactionType.REMOVE_PROXY]: 'proxyConfirm',
  [TransactionType.REMOVE_PURE_PROXY]: 'proxyConfirm',
  [TransactionType.PROXY]: 'unknownConfirm',
  // Remark
  [TransactionType.REMARK]: 'unknownConfirm',
  // Governance
  [TransactionType.UNLOCK]: 'unlockMst',
  [TransactionType.VOTE]: 'voteMst',
  [TransactionType.REVOTE]: 'revoteMst',
  [TransactionType.REMOVE_VOTE]: 'retractMst',
  [TransactionType.DELEGATE]: 'addDelegationConfirm',
  [TransactionType.UNDELEGATE]: 'revokeDelegationConfirm',
  [TransactionType.EDIT_DELEGATION]: 'editDelegationConfirm',

  // Collectives
  [TransactionType.COLLECTIVE_VOTE]: 'voteMst',
};

export const getIconName = (transaction?: Transaction | DecodedTransaction): IconNames => {
  if (!transaction?.type) return 'unknownConfirm';

  if (isEditDelegationTransaction(transaction)) {
    return 'editDelegationConfirm';
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.transactions?.[0]);
  }

  if (transaction.type === TransactionType.PROXY) {
    return getIconName(transaction?.args?.transaction);
  }

  return TransactionIcons[transaction.type];
};
