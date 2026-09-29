import { t } from 'i18next';

import { ValidationErrors } from '@/shared/lib/utils';

export const ValidationErrorLabels: Record<ValidationErrors, string> = {
  [ValidationErrors.EXPIRED]: t('transfer.expired'),
  [ValidationErrors.INVALID_ADDRESS]: t('transfer.invalidAddress'),
  [ValidationErrors.INSUFFICIENT_BALANCE]: t('transfer.notEnoughBalanceError'),
  [ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE]: t('transfer.notEnoughBalanceForFeeError'),
  [ValidationErrors.INVALID_SIGNATURE]: t('transfer.invalidSignature'),
  [ValidationErrors.ADDRESS_REQUIRED]: t('transfer.noSignatoryError'),
  [ValidationErrors.AMOUNT_REQUIRED]: t('transfer.noAmount'),
};
