import { TEST_IDS } from '@/shared/constants';

export class TransferModalElements {
  static addButton = 'Add';
  static multisigButton = 'Multisig';
  static feeRowLocator = TEST_IDS.OPERATIONS.ESTIMATE_FEE;

  static getUrl(chainId: number, assetId: number): string {
    if (chainId === undefined || assetId === undefined) {
      throw new Error('chainId and assetId must be defined');
    }

    return `#/assets/transfer?chainId=${chainId}&assetId=${assetId}`;
  }
}
