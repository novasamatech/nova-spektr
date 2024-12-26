import {
  type BaseTxInfo,
  type OptionsWithMeta,
  type UnsignedTransaction,
  defineMethod,
} from '@substrate/txwrapper-polkadot';

import { type XTokenPalletTransferArgs, type XcmPallet, type XcmPalletTransferArgs } from './types';

export function limitedReserveTransferAssets(
  pallet: XcmPallet,
  args: XcmPalletTransferArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction {
  return defineMethod(
    {
      method: {
        args,
        name: 'limitedReserveTransferAssets',
        pallet,
      },
      ...info,
    },
    options,
  );
}

export function limitedTeleportAssets(
  pallet: XcmPallet,
  args: XcmPalletTransferArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction {
  return defineMethod(
    {
      method: {
        args,
        name: 'limitedTeleportAssets',
        pallet,
      },
      ...info,
    },
    options,
  );
}

export function transferAssets(
  pallet: XcmPallet,
  args: XcmPalletTransferArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction {
  return defineMethod(
    {
      method: {
        args,
        name: 'transferAssets',
        pallet,
      },
      ...info,
    },
    options,
  );
}

export function transferMultiAsset(
  args: XTokenPalletTransferArgs,
  info: BaseTxInfo,
  options: OptionsWithMeta,
): UnsignedTransaction {
  return defineMethod(
    {
      method: {
        args,
        name: 'transferMultiasset',
        pallet: 'xTokens',
      },
      ...info,
    },
    options,
  );
}
