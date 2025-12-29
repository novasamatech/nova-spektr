import { TEST_IDS } from '@/shared/constants';

export class ValidationElements {
  static sendingAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:sending amount`;
  static networkFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:fee`;
  static originFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:origin fee`;
  static destinationFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:destination fee`;
  static proxyDepositError = `${TEST_IDS.VALIDATIONS.BALANCE}:proxy deposit`;
  static multisigDepositError = `${TEST_IDS.VALIDATIONS.BALANCE}:multisig deposit`;
}
