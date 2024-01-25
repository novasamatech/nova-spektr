import { Account, Wallet } from '../../../core';
import { permissionService } from '../permissionService';
import { OperationType } from './types';

export function getOperationTypeFn(operationType: OperationType): (wallet: Wallet, accounts: Account[]) => boolean {
  return {
    [OperationType.TRANSFER]: permissionService.isTransferAvailable,
    [OperationType.RECEIVE]: permissionService.isReceiveAvailable,
    [OperationType.STAKING]: permissionService.isStakingAvailable,
    [OperationType.CREATE_MULTISIG_TX]: permissionService.isCreateMultisigTxAvailable,
    [OperationType.APPROVE_MULTISIG_TX]: permissionService.isApproveMultisigTxAvailable,
    [OperationType.REJECT_MULTISIG_TX]: permissionService.isRejectMultisigTxAvailable,
    [OperationType.CREATE_ANY_PROXY]: permissionService.isCreateAnyProxyAvailable,
    [OperationType.CREATE_NON_ANY_PROXY]: permissionService.isCreateNonAnyProxyAvailable,
    [OperationType.REMOV_PROXY]: permissionService.isRemoveProxyAvailable,
  }[operationType];
}
