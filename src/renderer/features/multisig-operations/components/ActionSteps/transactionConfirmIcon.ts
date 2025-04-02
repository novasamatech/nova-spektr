import { type ApiPromise } from '@polkadot/api';

import { TransactionType } from '@/shared/core';
import { type IconNames } from '@/shared/ui/Icon/data';
import { type AnyDecodedTransaction, transactionService } from '@/domains/network';
import { getTransactionType, isEditDelegationTransaction } from '@/entities/transaction';

const TransactionIcons: Record<TransactionType, IconNames> = {
  // Transfer
  [TransactionType.ASSET_TRANSFER]: 'transferConfirm',
  [TransactionType.ORML_TRANSFER]: 'transferConfirm',
  [TransactionType.TRANSFER]: 'transferConfirm',
  [TransactionType.TRANSFER_ALL]: 'transferConfirm',
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
  [TransactionType.COLLECTIVE_SET_ACTIVE]: 'unknownMst',
  [TransactionType.COLLECTIVE_SUBMIT_EVIDENCE]: 'unknownMst',
  [TransactionType.COLLECTIVE_SALARY_INDUCT]: 'unknownMst',
  [TransactionType.COLLECTIVE_SALARY_REQUEST]: 'unknownMst',
  [TransactionType.COLLECTIVE_SALARY_PAYOUT]: 'unknownMst',
};

// TODO remove
export const getIconName = (api: ApiPromise, transaction?: AnyDecodedTransaction): IconNames => {
  const operationType = getTransactionType(transaction?.method, transaction?.section);

  if (!operationType) return 'unknownConfirm';

  if (isEditDelegationTransaction(transaction)) {
    return 'editDelegationConfirm';
  }

  if (transaction && transactionService.isBatchTransaction(transaction)) {
    const unwrapped = transactionService.unwrapTransaction(transaction.args.calls[0], api).at(-1);
    return getIconName(api, unwrapped);
  }

  return TransactionIcons[operationType];
};
