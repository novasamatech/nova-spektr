import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { stakingPallet } from '@/shared/pallet/staking';
import { __test, getEraStorage } from '../era-storage';

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
    __test.reset();
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

  it('keeps a newer read when an older one for the same key fails late', async () => {
    let rejectFirst = (_error: Error) => {};
    storage.erasStakersOverview
      .mockImplementationOnce(() => new Promise((_, reject) => (rejectFirst = reject)))
      .mockResolvedValue([]);
    const eraStorage = getEraStorage('0x05' as ChainId);

    const first = eraStorage.erasStakersOverview(api, 1).catch(() => 'failed');
    // Evict era 1 by filling the overview memo, then re-read it.
    for (let era = 2; era < 2 + __test.OVERVIEW_MEMO_MAX_ENTRIES; era++) {
      await eraStorage.erasStakersOverview(api, era);
    }
    const second = eraStorage.erasStakersOverview(api, 1);

    rejectFirst(new Error('late failure'));
    expect(await first).toBe('failed');
    expect(await second).toEqual([]);
    // Era 1 is still memoised by the second read - no third request.
    await eraStorage.erasStakersOverview(api, 1);
    expect(storage.erasStakersOverview).toHaveBeenCalledTimes(2 + __test.OVERVIEW_MEMO_MAX_ENTRIES);
  });

  it('drops a failed read so the next caller retries', async () => {
    storage.erasStakersOverview.mockRejectedValueOnce(new Error('rate limited')).mockResolvedValueOnce([]);
    const eraStorage = getEraStorage('0x04' as ChainId);

    await expect(eraStorage.erasStakersOverview(api, 7)).rejects.toThrow('rate limited');
    await expect(eraStorage.erasStakersOverview(api, 7)).resolves.toEqual([]);
    expect(storage.erasStakersOverview).toHaveBeenCalledTimes(2);
  });
});
