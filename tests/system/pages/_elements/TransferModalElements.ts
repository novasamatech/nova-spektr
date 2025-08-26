import { TEST_IDS } from '@/shared/constants';

export class TransferModalElements {
  static addButton = 'Add';
  static multisigButton = 'Multisig';
  static feeRowLocator = TEST_IDS.OPERATIONS.ESTIMATE_FEE;
  static feeValueLocator = 'AssetBalance';
  static amountInputLocator = TEST_IDS.OPERATIONS.AMOUNT_INPUT;
  static recipientInputLocator = TEST_IDS.OPERATIONS.RECIPIENT_INPUT;
  static signatoryLocator = TEST_IDS.OPERATIONS.SIGNATORY_SELECTOR;
  static signatoryOptionLocator = TEST_IDS.OPERATIONS.SIGNATORY_SELECTOR_OPTION;
  static xcmSelectorLocator = TEST_IDS.OPERATIONS.XCM_SELECTOR;

  static getUrl(chainId: string, assetId: number): string {
    if (chainId === undefined || assetId === undefined) {
      throw new Error('chainId and assetId must be defined');
    }

    return `/#/assets/transfer?chainId=${chainId}&assetId=${assetId}`;
  }
}
