import type { ObjectValues } from '@renderer/shared/core';

export const OperationError = {
  INVALID_FEE: 'staking.notEnoughBalanceForFeeError',
  INVALID_DEPOSIT: 'staking.notEnoughBalanceForDepositError',
  EMPTY_ERROR: ' ', // error for invalid state with no hint text
} as const;

export type OperationErrorType = ObjectValues<typeof OperationError>;
