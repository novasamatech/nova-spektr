import { type ApiPromise } from '@polkadot/api';

import { XcmTransferType } from '@/shared/api/xcm';
import { TransactionType } from '@/shared/core';

export const xcmTransferUtils = {
  getXcmTransferType,
};

function getXcmTransferType(api: ApiPromise, type: XcmTransferType): TransactionType {
  if (type === XcmTransferType.XTOKENS) {
    return TransactionType.XTOKENS_TRANSFER_MULTIASSET;
  }

  if (type === XcmTransferType.XCMPALLET_TRANSFER_ASSETS) {
    return TransactionType.POLKADOT_XCM_TRANSFER_ASSETS;
  }

  if (type === XcmTransferType.XCMPALLET_TELEPORT) {
    return api.tx.xcmPallet ? TransactionType.XCM_TELEPORT : TransactionType.POLKADOT_XCM_TELEPORT;
  }

  return api.tx.xcmPallet ? TransactionType.XCM_LIMITED_TRANSFER : TransactionType.POLKADOT_XCM_LIMITED_TRANSFER;
}
