import { type EventCallable, launch, scopeBind } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { toAccountId } from '@/shared/lib/utils';
import { backendAuthService, draftsService } from '@/domains/backend';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';
// Imported for its side effects: the module wires the poll on load.
import '@/features/drafts/model/drafts-model';
import { type FeatureTestEnvironment, FeatureTestBuilder } from '../../utils/index';

// The drafts poll ticks every 30s and its `stop` only listens for `signOutClicked`
// / `urlCleared`. Session expiry raises neither and leaves `$authState` intact, so
// without the `$isConnectionAlive` gate on the tick the poll fires doomed requests
// forever. These tests pin the gate.
const POLL_INTERVAL = 30_000;

const ACCOUNT_ID = '0x1e24a5f39f47b5e3a1b2c9d0e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4';

const authState = {
  accountId: toAccountId(ACCOUNT_ID),
  accountName: 'Signer',
  permissions: [],
};

// `draftsResource`'s request cache is per-resource-instance and keyed on the
// backend url — it lives outside the effector scope, so `fork()` never clears it
// and entries bleed across tests (worse under fake timers, which rewind
// `Date.now()`). A distinct url per test keeps each one on its own cache key.
let urlCounter = 0;

describe('drafts polling gate', () => {
  let env: FeatureTestEnvironment;
  let baseUrl: string;
  let fetchDrafts: ReturnType<typeof vi.spyOn>;

  // `allSettled` never resolves against this model: patronum's `interval` keeps a
  // timer effect pending for the scope's lifetime. Fire, then advance the clock.
  const fire = (event: EventCallable<void>) => {
    launch({ target: event, params: undefined, scope: env.scope });
  };

  beforeEach(async () => {
    baseUrl = `https://backend-${urlCounter++}.test`;
    fetchDrafts = vi.spyOn(draftsService, 'fetchDrafts').mockResolvedValue([]);

    // `build()` awaits real async (Dexie) — fake timers must be installed after.
    env = await new FeatureTestBuilder({ autoPopulate: false })
      .withStoreValue(backendConfigurationModel.$backendUrl, baseUrl)
      .withStoreValue(authModel.$authState, authState)
      .build();

    vi.useFakeTimers();
    fire(authModel.events.signInSucceeded);
    fetchDrafts.mockClear();
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await env.cleanup();
  });

  it('polls while the connection is alive', async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 2);

    expect(fetchDrafts).toHaveBeenCalledTimes(2);
  });

  it('skips ticks once the session has expired', async () => {
    fire(authModel.events.unauthorizedResponseReceived);
    expect(env.getState(authModel.$isConnectionAlive)).toBe(false);

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 3);

    expect(fetchDrafts).not.toHaveBeenCalled();
  });

  it('resumes polling once the session recovers', async () => {
    fire(authModel.events.unauthorizedResponseReceived);
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    expect(fetchDrafts).not.toHaveBeenCalled();

    // The real recovery path: a session check that finds a live session resets
    // `$isSessionExpired`, which reopens the gate.
    vi.spyOn(backendAuthService, 'checkSession').mockResolvedValue({
      accountId: ACCOUNT_ID,
      permissions: [],
    });
    await scopeBind(authModel.__test.checkSessionFx, { scope: env.scope })(baseUrl);

    expect(env.getState(authModel.$isConnectionAlive)).toBe(true);

    fetchDrafts.mockClear();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);

    expect(fetchDrafts).toHaveBeenCalled();
  });
});
