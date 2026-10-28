export const enum ValidationErrors {
  ADDRESS_REQUIRED,
  INVALID_ADDRESS,
  AMOUNT_REQUIRED,
  INSUFFICIENT_BALANCE,
  INSUFFICIENT_BALANCE_FOR_FEE,
  INVALID_SIGNATURE,
  EXPIRED,
}

/**
 * I18n keys of the user-facing labels for each validation error; translate at
 * render time.
 */
export const ValidationErrorLabels: Record<ValidationErrors, string> = {
  [ValidationErrors.EXPIRED]: 'transfer.expired',
  [ValidationErrors.INVALID_ADDRESS]: 'transfer.invalidAddress',
  [ValidationErrors.INSUFFICIENT_BALANCE]: 'transfer.notEnoughBalanceError',
  [ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE]: 'transfer.notEnoughBalanceForFeeError',
  [ValidationErrors.INVALID_SIGNATURE]: 'transfer.invalidSignature',
  [ValidationErrors.ADDRESS_REQUIRED]: 'transfer.noSignatoryError',
  [ValidationErrors.AMOUNT_REQUIRED]: 'transfer.noAmount',
};
