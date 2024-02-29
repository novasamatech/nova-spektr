import { ApiPromise } from '@polkadot/api';
import { BN, BN_TWO } from '@polkadot/util';

import { getExpectedBlockTime } from '../substrate';
import { DEFAULT_TIME, THRESHOLD } from '../constants';

describe('shared/lib/utils/substrate', () => {
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
    expect(time).toEqual(blockTime.muln(2));
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
