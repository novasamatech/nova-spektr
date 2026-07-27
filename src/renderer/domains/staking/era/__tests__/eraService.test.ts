import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { z } from 'zod';

import { type Chain } from '@/shared/core';
import { eraService } from '../service';

vi.mock('@/shared/pallet/staking', () => ({
  stakingPallet: {
    // `subscribeActiveEra` is not under test — a permissive schema is enough to
    // let the module initialize.
    schema: { stakingActiveEraInfo: z.unknown() },
    storage: {
      activeEra: vi.fn(),
      bondedEras: vi.fn(),
      erasStartSessionIndex: vi.fn(),
    },
    consts: {
      sessionsPerEra: vi.fn(),
    },
  },
}));

const { stakingPallet } = await import('@/shared/pallet/staking');

const storage = vi.mocked(stakingPallet.storage);
const consts = vi.mocked(stakingPallet.consts);

const ERA = 10;
const SESSIONS_PER_ERA = 6;
const SESSION_DURATION = 600;
const BLOCK_TIME_MS = 6000;
const ERA_DURATION_MS = SESSIONS_PER_ERA * SESSION_DURATION * BLOCK_TIME_MS;

const NOW = 1_700_000_000_000;

const api = {} as ApiPromise;
const chain = { chainId: '0x00', addressPrefix: 0 } as unknown as Chain;

function createTimelineApi({ currentSessionIndex = 1002, genesisSlot = 0, babe = true } = {}) {
  return {
    consts: {
      babe: babe ? { epochDuration: SESSION_DURATION, expectedBlockTime: BLOCK_TIME_MS } : undefined,
    },
    query: {
      session: { currentIndex: () => Promise.resolve(currentSessionIndex) },
      babe: {
        // 300 slots into the current session
        currentSlot: () => Promise.resolve(currentSessionIndex * SESSION_DURATION + genesisSlot + 300),
        genesisSlot: () => Promise.resolve(genesisSlot),
      },
    },
  } as unknown as ApiPromise;
}

describe('domains/staking/era/service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consts.sessionsPerEra.mockReturnValue(SESSIONS_PER_ERA);
  });

  describe('resolveEraStartSession', () => {
    test('should read the start session from bondedEras', async () => {
      storage.bondedEras.mockResolvedValue([
        { era: 9, session: 994 },
        { era: ERA, session: 1000 },
      ]);

      await expect(eraService.resolveEraStartSession(api, ERA)).resolves.toEqual(1000);
      expect(storage.erasStartSessionIndex).not.toHaveBeenCalled();
    });

    test('should fall back to erasStartSessionIndex when bondedEras is absent', async () => {
      storage.bondedEras.mockResolvedValue(null);
      storage.erasStartSessionIndex.mockResolvedValue(1000);

      await expect(eraService.resolveEraStartSession(api, ERA)).resolves.toEqual(1000);
      expect(storage.erasStartSessionIndex).toHaveBeenCalledWith(api, ERA);
    });

    test('should fall back when bondedEras has no entry for the era', async () => {
      storage.bondedEras.mockResolvedValue([{ era: 9, session: 994 }]);
      storage.erasStartSessionIndex.mockResolvedValue(1000);

      await expect(eraService.resolveEraStartSession(api, ERA)).resolves.toEqual(1000);
    });

    test('should return null when neither source is available', async () => {
      storage.bondedEras.mockRejectedValue(new Error('not in metadata'));
      storage.erasStartSessionIndex.mockRejectedValue(new Error('not in metadata'));

      await expect(eraService.resolveEraStartSession(api, ERA)).resolves.toBeNull();
    });
  });

  describe('getEraStart', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should use the activation timestamp exposed by the runtime', async () => {
      storage.activeEra.mockResolvedValue({ index: ERA, start: new BN(NOW - 1000) });

      await expect(eraService.getEraStart(api, createTimelineApi(), chain)).resolves.toEqual({
        eraStartMs: NOW - 1000,
        eraDurationMs: ERA_DURATION_MS,
      });
      expect(storage.bondedEras).not.toHaveBeenCalled();
    });

    test('should derive the anchor from session progress when the timestamp is absent', async () => {
      storage.activeEra.mockResolvedValue({ index: ERA, start: null });
      storage.bondedEras.mockResolvedValue([{ era: ERA, session: 1000 }]);

      // 2 full sessions + 300 slots into the era
      const eraProgressSlots = 2 * SESSION_DURATION + 300;

      await expect(eraService.getEraStart(api, createTimelineApi(), chain)).resolves.toEqual({
        eraStartMs: NOW - eraProgressSlots * BLOCK_TIME_MS,
        eraDurationMs: ERA_DURATION_MS,
      });
    });

    test('should return null when the era start session cannot be resolved', async () => {
      storage.activeEra.mockResolvedValue({ index: ERA, start: null });
      storage.bondedEras.mockResolvedValue(null);
      storage.erasStartSessionIndex.mockResolvedValue(null);

      await expect(eraService.getEraStart(api, createTimelineApi(), chain)).resolves.toBeNull();
    });

    test('should return null when there is no active era', async () => {
      storage.activeEra.mockResolvedValue(null);

      await expect(eraService.getEraStart(api, createTimelineApi(), chain)).resolves.toBeNull();
    });

    test('should return null when the timeline chain has no session consts', async () => {
      storage.activeEra.mockResolvedValue({ index: ERA, start: new BN(NOW) });

      await expect(eraService.getEraStart(api, createTimelineApi({ babe: false }), chain)).resolves.toBeNull();
    });
  });
});
