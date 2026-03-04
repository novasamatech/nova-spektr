import { type ApiPromise } from '@polkadot/api';
import { BN, BN_TWO } from '@polkadot/util';

import { type Chain } from '@/shared/core';
import { DEFAULT_TIME, THRESHOLD } from '../constants';
import { getExpectedBlockTime } from '../substrate';

describe('shared/lib/onChainUtils/substrate', () => {
  const blockTime = new BN(10_000);

  const getTime = (params: any, chain?: Chain): BN => {
    const mockApi = params as unknown as ApiPromise;

    return getExpectedBlockTime(mockApi, chain);
  };

  test('should use chain defaultBlockTime when provided', () => {
    const chain = { additional: { defaultBlockTime: 6000 } } as Chain;
    const time = getTime({ consts: {} }, chain);
    expect(time.toNumber()).toEqual(6000);
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
});
