import { ApiPromise } from '@polkadot/api';
import { BN, BN_TWO } from '@polkadot/util';

import { DEFAULT_TIME, THRESHOLD } from '@renderer/services/network/common/constants';
import { useChains } from '../chainsService';
import { Chain } from '@renderer/domain/chain';

describe('service/chainsService', () => {
  test('should init', () => {
    const { sortChains, getChainsData, getExpectedBlockTime, getStakingChainsData } = useChains();

    expect(sortChains).toBeDefined();
    expect(getChainsData).toBeDefined();
    expect(getExpectedBlockTime).toBeDefined();
    expect(getStakingChainsData).toBeDefined();
  });

  test('should sort data', () => {
    const polkadot = { name: 'Polkadot' } as Chain;
    const kusama = { name: 'Kusama' } as Chain;
    const testnet = { name: 'Westend', options: ['testnet'] } as Chain;
    const parachain = { name: 'Acala' } as Chain;

    const { sortChains } = useChains();
    const data = sortChains([testnet, polkadot, parachain, kusama]);

    expect(data).toEqual([polkadot, kusama, parachain, testnet]);
  });
});

describe('service/chainsService/getExpectedBlockTime', () => {
  const blockTime = new BN(10_000);

  const getTime = (params: any): BN => {
    const mockApi = params as unknown as ApiPromise;
    const { getExpectedBlockTime } = useChains();

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
