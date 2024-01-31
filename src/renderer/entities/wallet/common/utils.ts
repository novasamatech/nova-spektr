import { Account, Wallet } from '@shared/core';
import { permissionUtils } from '../lib/permission-utils';
import { OperationType } from './types';

export function getOperationTypeFn(operationType: OperationType): (wallet: Wallet, accounts: Account[]) => boolean {
  return {
    [OperationType.TRANSFER]: permissionUtils.isTransferAvailable,
    [OperationType.RECEIVE]: permissionUtils.isReceiveAvailable,
    [OperationType.STAKING]: permissionUtils.isStakingAvailable,
    [OperationType.CREATE_MULTISIG_TX]: permissionUtils.isCreateMultisigTxAvailable,
    [OperationType.APPROVE_MULTISIG_TX]: permissionUtils.isApproveMultisigTxAvailable,
    [OperationType.REJECT_MULTISIG_TX]: permissionUtils.isRejectMultisigTxAvailable,
    [OperationType.CREATE_ANY_PROXY]: permissionUtils.isCreateAnyProxyAvailable,
    [OperationType.CREATE_NON_ANY_PROXY]: permissionUtils.isCreateNonAnyProxyAvailable,
    [OperationType.REMOV_PROXY]: permissionUtils.isRemoveProxyAvailable,
  }[operationType];
}
