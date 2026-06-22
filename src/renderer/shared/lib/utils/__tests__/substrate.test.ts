import { type ApiPromise } from '@polkadot/api';
import { BN, BN_TWO } from '@polkadot/util';

import { type Chain, type HexString } from '@/shared/core';
// eslint-disable-next-line boundaries/entry-point -- reusing a real metadata blob fixture in tests only
import { metadata as KUSAMA_V14_METADATA } from '@/entities/transaction/lib/__tests__/metadata';
import { DEFAULT_TIME, THRESHOLD } from '../constants';
import { getExpectedBlockTime, readSpecVersion } from '../substrate';

describe('shared/lib/onChainUtils/substrate', () => {
  const blockTime = new BN(10_000);

  const defaultChain = {} as Chain;

  const getTime = (params: any, chain: Chain = defaultChain): BN => {
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

describe('readSpecVersion', () => {
  test('reads spec version from the System.Version constant of v14 metadata', () => {
    expect(readSpecVersion(KUSAMA_V14_METADATA as HexString)).toEqual(9430);
  });

  test('throws when the bytes are not decodable metadata', () => {
    expect(() => readSpecVersion('0xdeadbeef' as HexString)).toThrow();
  });
});
