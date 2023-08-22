import { ObjectValues } from '@renderer/domain/utility';

export const OperationError = {
  INVALID_FEE: 'staking.notEnoughBalanceForFeeError',
  INVALID_DEPOSIT: 'staking.notEnoughBalanceForDepositError',
  EMPTY_ERROR: ' ',
} as const;

export type OperationErrorType = ObjectValues<typeof OperationError>;
