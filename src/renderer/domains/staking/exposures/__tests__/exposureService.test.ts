import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';

import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { exposureService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    storage: {
      erasStakersOverview: vi.fn(),
      erasStakersPaged: vi.fn(),
    },
  },
}));

const storage = vi.mocked(stakingPallet.storage);

const api = {} as ApiPromise;
const ERA = 100;

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;
const nominatorA = '0xa1' as AccountId;
const nominatorB = '0xa2' as AccountId;
const nominatorC = '0xa3' as AccountId;

const overview = (total: number, own: number, nominatorCount: number, pageCount: number) => ({
  total: new BN(total),
  own: new BN(own),
  nominatorCount,
  pageCount,
});

const page = (index: number, others: [AccountId, number][]) => ({
  page: index,
  exposure: {
    pageTotal: new BN(others.reduce((acc, [, value]) => acc + value, 0)),
    others: others.map(([who, value]) => ({ who, value: new BN(value) })),
  },
});

describe('exposureService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEraOverviews', () => {
    test('should map the era overviews into a validator-keyed record', async () => {
      storage.erasStakersOverview.mockResolvedValue([
        { validator: alice, overview: overview(1000, 100, 12, 2) },
        { validator: bob, overview: overview(2000, 500, 1, 1) },
      ]);

      const result = await exposureService.getEraOverviews(api, ERA);

      expect(result).toEqual({
        [alice]: { total: '1000', own: '100', nominatorCount: 12, pageCount: 2 },
        [bob]: { total: '2000', own: '500', nominatorCount: 1, pageCount: 1 },
      });
    });
  });

  describe('getExposurePages', () => {
    test('should merge the overview with the paged nominators', async () => {
      storage.erasStakersPaged.mockResolvedValue([page(0, [[nominatorA, 400]])]);

      const result = await exposureService.getExposurePages(api, ERA, [alice], {
        [alice]: { total: '1000', own: '600', nominatorCount: 1, pageCount: 1 },
      });

      expect(result[alice]).toEqual({
        total: '1000',
        own: '600',
        nominatorCount: 1,
        pageCount: 1,
        others: [{ who: nominatorA, value: '400' }],
      });
    });

    test('should flatten multiple pages in page order', async () => {
      storage.erasStakersPaged.mockResolvedValue([
        page(1, [[nominatorC, 30]]),
        page(0, [
          [nominatorA, 10],
          [nominatorB, 20],
        ]),
      ]);

      const result = await exposureService.getExposurePages(api, ERA, [alice]);

      expect(result[alice]?.others).toEqual([
        { who: nominatorA, value: '10' },
        { who: nominatorB, value: '20' },
        { who: nominatorC, value: '30' },
      ]);
    });

    test('should derive the overview fields from the pages when no overview is known', async () => {
      storage.erasStakersPaged.mockResolvedValue([page(0, [[nominatorA, 10]]), page(1, [[nominatorB, 20]])]);

      const result = await exposureService.getExposurePages(api, ERA, [alice]);

      expect(result[alice]).toMatchObject({
        total: '30',
        own: '0',
        nominatorCount: 2,
        pageCount: 2,
      });
    });

    test('should tolerate a validator without any exposure pages', async () => {
      storage.erasStakersPaged.mockResolvedValue([]);

      const result = await exposureService.getExposurePages(api, ERA, [alice], {
        [alice]: { total: '1000', own: '1000', nominatorCount: 0, pageCount: 0 },
      });

      expect(result[alice]).toEqual({
        total: '1000',
        own: '1000',
        nominatorCount: 0,
        pageCount: 0,
        others: [],
      });
    });

    test('should read every requested validator exactly once', async () => {
      storage.erasStakersPaged.mockResolvedValue([]);

      await exposureService.getExposurePages(api, ERA, [alice, bob]);

      expect(storage.erasStakersPaged).toHaveBeenCalledTimes(2);
      expect(storage.erasStakersPaged).toHaveBeenCalledWith(api, ERA, alice);
      expect(storage.erasStakersPaged).toHaveBeenCalledWith(api, ERA, bob);
    });
  });
});
