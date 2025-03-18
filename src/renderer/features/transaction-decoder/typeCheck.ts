import { type Address } from '@/shared/core';
import { type AnyDecodedTransaction, type DecodedTransaction } from '@/domains/network';

export type TransferTransaction = DecodedTransaction<{
  dest: Address;
  value: string;
}>;
export const isTransferTranasction = (t: AnyDecodedTransaction): t is TransferTransaction => {
  return t.section === 'balances' && ['transferKeepAlive', 'transfer', 'transferAll'].includes(t.method);
};

export type AssetTransferTransaction = DecodedTransaction<{
  assetId: string;
  dest: Address;
  value: string;
}>;
export const isAssetTransferTranasction = (t: AnyDecodedTransaction): t is TransferTransaction => {
  return ['assets', 'currencies'].includes(t.section) && t.method === 'transfer';
};

export type XcmTransferTransaction = DecodedTransaction<{
  dest: unknown;
  beneficiary: Address;
  assets: unknown;
}>;
export const isXcmTransferTranasction = (t: AnyDecodedTransaction): t is TransferTransaction => {
  return (
    (t.section === 'xcmPallet' && ['limitedReserveTransferAssets', 'limitedTeleportAssets'].includes(t.method)) ||
    (t.section === 'polkadotXcm' &&
      ['limitedReserveTransferAssets', 'limitedTeleportAssets', 'transferAssets'].includes(t.method))
  );
};
