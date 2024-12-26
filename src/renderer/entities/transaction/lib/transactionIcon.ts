import { type DecodedTransaction, type Transaction, TransactionType } from '@/shared/core';
import { type IconNames } from '@/shared/ui/Icon/data';

import { isEditDelegationTransaction } from './common/utils';

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
  [TransactionType.POLKADOT_XCM_TRANSFER_ASSETS]: 'crossChain',
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
  // Proxy
  [TransactionType.ADD_PROXY]: 'proxyMst',
  [TransactionType.CREATE_PURE_PROXY]: 'proxyMst',
  [TransactionType.REMOVE_PROXY]: 'proxyMst',
  [TransactionType.REMOVE_PURE_PROXY]: 'proxyMst',
  [TransactionType.PROXY]: 'unknownMst',
  // Remark
  [TransactionType.REMARK]: 'unknownMst',
  // Governance
  [TransactionType.UNLOCK]: 'unlockMst',
  [TransactionType.VOTE]: 'voteMst',
  [TransactionType.REVOTE]: 'revoteMst',
  [TransactionType.REMOVE_VOTE]: 'retractMst',
  [TransactionType.DELEGATE]: 'delegateMst',
  [TransactionType.UNDELEGATE]: 'undelegateMst',
  [TransactionType.EDIT_DELEGATION]: 'editDelegationMst',
  // Collectives
  [TransactionType.COLLECTIVE_VOTE]: 'voteMst',
};

export const getIconName = (transaction?: Transaction | DecodedTransaction): IconNames => {
  if (!transaction?.type) return 'question';

  if (isEditDelegationTransaction(transaction)) {
    return 'editDelegationMst';
  }

  if (transaction.type === TransactionType.BATCH_ALL) {
    return getIconName(transaction?.args?.transactions?.[0]);
  }

  if (transaction.type === TransactionType.PROXY) {
    return getIconName(transaction?.args?.transaction);
  }

  return TransactionIcons[transaction.type];
};
