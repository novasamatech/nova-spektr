export class TransferModalElements {
  static addButton = 'Add';
  static multisigButton = 'Multisig';
  static feePattern = /^\d+\.\d+\s+\w+$/;
  static feeRowLocator = 'div.flex.justify-between.items-center.w-full';
  static feeLocator = 'dd > div > span.text-body.text-text-primary';

  static getUrl(chainId: number, assetId: number): string {
    if (chainId === undefined || assetId === undefined) {
      throw new Error('chainId and assetId must be defined');
    }

    return `#/assets/transfer?chainId=${chainId}&assetId=${assetId}`;
  }
}
