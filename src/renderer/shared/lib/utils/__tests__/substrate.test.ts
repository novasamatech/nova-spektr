import { type ApiPromise } from '@polkadot/api';
import { BN, BN_TWO } from '@polkadot/util';

import { XcmTransferType } from '@/shared/api/xcm';
import { XcmPallets } from '@/shared/core';
import { DEFAULT_TIME, THRESHOLD } from '../constants';
import { getExpectedBlockTime, getPalletAndCallByXcmTransferType } from '../substrate';

describe('shared/lib/onChainUtils/substrate', () => {
  const blockTime = new BN(10_000);

  const getTime = (params: any): BN => {
    const mockApi = params as unknown as ApiPromise;

    return getExpectedBlockTime(mockApi);
  };

  test('should get expected block time from Subspace', () => {
    const time = getTime({ consts: { subspace: { expectedBlockTime: blockTime } } });
    expect(time).toEqual(blockTime);
  });

  test('should get expected block time with Threshold check', () => {
    const time = getTime({ consts: { timestamp: { minimumPeriod: blockTime } } });
    expect(time.toString()).toEqual(blockTime.muln(2).toString());
  });

  test('should get expected block time with ParachainSystem', () => {
    const params = {
      consts: { timestamp: { minimumPeriod: THRESHOLD.divn(2) } },
      query: { parachainSystem: blockTime },
    };
    const time = getTime(params);
    expect(time).toEqual(DEFAULT_TIME.mul(BN_TWO));
  });

  test('should get expected block time with Default', () => {
    const params = {
      consts: { timestamp: { minimumPeriod: THRESHOLD.divn(2) } },
      query: { parachainSystem: undefined },
    };
    const time = getTime(params);
    expect(time).toEqual(DEFAULT_TIME);
  });

  test('should return XTOKENS and "transferMultiasset" call for XTOKENS', () => {
    const api = {} as unknown as ApiPromise;
    const transferType = XcmTransferType.XTOKENS;

    const result = getPalletAndCallByXcmTransferType(api, transferType);

    expect(result.pallet).toEqual(XcmPallets.XTOKENS);
    expect(result.call).toEqual('transferMultiasset');
  });

  test('should return XCM_PALLET and "limitedReserveTransferAssets" call for XCMPALLET', () => {
    const api = { tx: { xcmPallet: true } } as unknown as ApiPromise;
    const transferType = XcmTransferType.XCMPALLET;

    const result = getPalletAndCallByXcmTransferType(api, transferType);

    expect(result.pallet).toEqual(XcmPallets.XCM_PALLET);
    expect(result.call).toEqual('limitedReserveTransferAssets');
  });

  test('should return XCM_PALLET and "limitedTeleportAssets" call for XCMPALLET_TELEPORT', () => {
    const api = { tx: { xcmPallet: true } } as unknown as ApiPromise;
    const transferType = XcmTransferType.XCMPALLET_TELEPORT;

    const result = getPalletAndCallByXcmTransferType(api, transferType);

    expect(result.pallet).toEqual(XcmPallets.XCM_PALLET);
    expect(result.call).toEqual('limitedTeleportAssets');
  });
});
