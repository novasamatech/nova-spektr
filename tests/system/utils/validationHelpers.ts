import { type Page } from '@playwright/test';

import { TEST_IDS } from '@/shared/constants';
import { ValidationElements } from '../pages/_elements/ValidationElements';
import { Validation } from '../utils/validationTestCases';

export function getValidationLocators(page: Page, v: Validation) {
  const fatal = page.getByTestId(TEST_IDS.VALIDATIONS.FATAL);
  const missingAccount = page.getByTestId(TEST_IDS.VALIDATIONS.MISSING_ACCOUNT);
  const permission = page.getByTestId(TEST_IDS.VALIDATIONS.PERMISSION);
  const balance = page.getByTestId(TEST_IDS.VALIDATIONS.BALANCE);

  switch (v) {
    case Validation.fatal:
      return [fatal];
    case Validation.missingAccount:
      return [missingAccount];
    case Validation.permission:
      return [permission];
    case Validation.balance:
      return [balance];
    case Validation.sendingAmount:
      return [balance, page.getByTestId(ValidationElements.sendingAmountError)];
    case Validation.networkFee:
      return [balance, page.getByTestId(ValidationElements.networkFeeAmountError)];
    case Validation.originFee:
      return [balance, page.getByTestId(ValidationElements.crossChainFeeAmountError)];
    case Validation.deliveryFee:
      return [balance, page.getByTestId(ValidationElements.deliveryFeeAmountError)];
    case Validation.multisigDeposit:
      return [balance, page.getByTestId(ValidationElements.multisigDepositError)];
    case Validation.proxyDeposit:
      return [balance, page.getByTestId(ValidationElements.proxyDepositError)];
  }
}
