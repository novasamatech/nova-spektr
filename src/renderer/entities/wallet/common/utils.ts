import { Account, Wallet } from '@shared/core';
import { permissionUtils } from '../lib/permission-utils';
import { OperationType } from './types';

export function getOperationTypeFn(operationType: OperationType): (wallet: Wallet, accounts: Account[]) => boolean {
  return {
    [OperationType.TRANSFER]: permissionUtils.canTransfer,
    [OperationType.RECEIVE]: permissionUtils.canReceive,
    [OperationType.STAKING]: permissionUtils.canStake,
    [OperationType.CREATE_MULTISIG_TX]: permissionUtils.canCreateMultisigTx,
    [OperationType.APPROVE_MULTISIG_TX]: permissionUtils.canApproveMultisigTx,
    [OperationType.REJECT_MULTISIG_TX]: permissionUtils.canRejectMultisigTx,
    [OperationType.CREATE_ANY_PROXY]: permissionUtils.canCreateAnyProxy,
    [OperationType.CREATE_NON_ANY_PROXY]: permissionUtils.canCreateNonAnyProxy,
    [OperationType.REMOV_PROXY]: permissionUtils.canRemoveProxy,
  }[operationType];
}
