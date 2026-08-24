import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { createAccountId } from '@/shared/mocks';

import { getEraStorage } from '../era-storage';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    storage: {
      erasStakersPaged: vi.fn(),
      erasStakersOverview: vi.fn(),
      erasRewardPoints: vi.fn(),
    },
  },
}));

const storage = vi.mocked(stakingPallet.storage);
const api = {} as ApiPromise;
const validator = createAccountId('validator');

describe('domains/staking/era-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads a validator page set once per (era, validator) and shares the in-flight read', async () => {
    storage.erasStakersPaged.mockResolvedValue([]);
    const eraStorage = getEraStorage('0x01' as ChainId);

    const [first, second] = await Promise.all([
      eraStorage.erasStakersPaged(api, 100, validator),
      eraStorage.erasStakersPaged(api, 100, validator),
    ]);
    await eraStorage.erasStakersPaged(api, 100, validator);

    expect(first).toBe(second);
    expect(storage.erasStakersPaged).toHaveBeenCalledTimes(1);

    await eraStorage.erasStakersPaged(api, 101, validator);
    expect(storage.erasStakersPaged).toHaveBeenCalledTimes(2);
  });

  it('keeps chains apart', async () => {
    storage.erasRewardPoints.mockResolvedValue({ total: 0, individual: [] });

    await getEraStorage('0x02' as ChainId).erasRewardPoints(api, 5);
    await getEraStorage('0x03' as ChainId).erasRewardPoints(api, 5);

    expect(storage.erasRewardPoints).toHaveBeenCalledTimes(2);
  });

  it('drops a failed read so the next caller retries', async () => {
    storage.erasStakersOverview.mockRejectedValueOnce(new Error('rate limited')).mockResolvedValueOnce([]);
    const eraStorage = getEraStorage('0x04' as ChainId);

    await expect(eraStorage.erasStakersOverview(api, 7)).rejects.toThrow('rate limited');
    await expect(eraStorage.erasStakersOverview(api, 7)).resolves.toEqual([]);
    expect(storage.erasStakersOverview).toHaveBeenCalledTimes(2);
  });
});
