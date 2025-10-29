import { TEST_IDS } from '@/shared/constants';

export class ValidationElements {
  static sendingAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:sending amount`;
  static networkFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:fee`;
  static crossChainFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:cross-chain fee`;
  static deliveryFeeAmountError = `${TEST_IDS.VALIDATIONS.BALANCE}:delivery fee`;
  static proxyDepositError = `${TEST_IDS.VALIDATIONS.BALANCE}:proxy deposit`;
  static multisigDepositError = `${TEST_IDS.VALIDATIONS.BALANCE}:multisig deposit`;
}
