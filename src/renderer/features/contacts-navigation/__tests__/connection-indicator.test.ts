import { type Scope, allSettled, fork } from 'effector';
import { describe, expect, test, vi } from 'vitest';

import { $features, updateFeatureStatus } from '@/shared/config/features';
import { toAccountId } from '@/shared/lib/utils';
import { HttpError } from '@/domains/backend';
import { authModel, backendConfigurationModel, connectionHistoryModel } from '@/aggregates/backend';
import { backendContactsModel } from '@/features/contacts';

/**
 * Mirrors the inline logic of `AddressBookStatusDot` +
 * `AddressBookReconnectPill`. Tests assert the derived UI state — kept here in
 * one place so a future refactor that extracts this into the model layer still
 * satisfies the same matrix.
 */
type DotState = 'hidden' | 'positive' | 'warning' | 'default';

function readIndicatorState(scope: Scope): { dot: DotState; pillVisible: boolean } {
  const featureEnabled = scope.getState($features).addressBookStatus;
  const hasEverConnected = scope.getState(connectionHistoryModel.$hasEverConnected);
  const isAuthenticated = scope.getState(authModel.$isAuthenticated);
  const isSessionExpired = scope.getState(authModel.$isSessionExpired);
  const hasNetworkIssue = scope.getState(authModel.$hasNetworkIssue);
  const syncStatus = scope.getState(backendContactsModel.$syncStatus);
  const isHealthy = scope.getState(backendContactsModel.$isHealthy);

  let dot: DotState;
  if (!featureEnabled || !hasEverConnected) {
    dot = 'hidden';
  } else if (isSessionExpired || hasNetworkIssue || syncStatus === 'error') {
    dot = 'warning';
  } else if (isAuthenticated) {
    dot = 'positive';
  } else {
    dot = 'default';
  }

  const pillVisible = featureEnabled && hasEverConnected && !isHealthy;

  return { dot, pillVisible };
}

const baseUrl = 'https://backend.example.com';
const authedAccountId = toAccountId('0x04');

const authedState = {
  accountId: authedAccountId,
  accountName: 'Signer',
  permissions: [] as string[],
};

describe('features/contacts-navigation — global address book connection indicator', () => {
  describe('feature flag and history gating', () => {
    test('is fully hidden on cold start (never connected, no URL)', () => {
      const scope = fork();

      const state = readIndicatorState(scope);

      expect(state.dot).toBe('hidden');
      expect(state.pillVisible).toBe(false);
    });

    test('stays hidden when feature flag is off, even with an active healthy session', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
      });

      await allSettled(updateFeatureStatus, { scope, params: ['addressBookStatus', false] });

      const state = readIndicatorState(scope);

      expect(state.dot).toBe('hidden');
      expect(state.pillVisible).toBe(false);
    });

    test('stays hidden when the very first sign-in fails (hasEverConnected never flipped)', () => {
      // The verify/challenge failure path sets $error and $authStep='error' on the modal, but
      // leaves $authState=null, $hasEverConnected=false. The global indicator MUST stay silent —
      // the modal owns the error UX. Otherwise a first-time user gets a dot before they've ever
      // had a working connection.
      const scope = fork({
        values: new Map().set(backendConfigurationModel.$backendUrl, baseUrl),
      });

      const state = readIndicatorState(scope);

      expect(scope.getState(connectionHistoryModel.$hasEverConnected)).toBe(false);
      expect(state.dot).toBe('hidden');
      expect(state.pillVisible).toBe(false);
    });
  });

  describe('successful connection', () => {
    test('hasEverConnected flips to true when authState becomes non-null', async () => {
      const scope = fork();

      // Mirrors connection-history-model wiring:
      //   sample({ clock: authModel.$authState, filter: state => state !== null, fn: () => true })
      await allSettled(authModel.$authState, { scope, params: authedState });

      expect(scope.getState(connectionHistoryModel.$hasEverConnected)).toBe(true);

      const state = readIndicatorState(scope);
      expect(state.dot).toBe('positive');
      expect(state.pillVisible).toBe(false);
    });
  });

  describe('session expired', () => {
    test('warning + reconnect pill when session expires while authState is retained', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
      });

      await allSettled(authModel.events.unauthorizedResponseReceived, { scope });

      const state = readIndicatorState(scope);

      expect(scope.getState(authModel.$isSessionExpired)).toBe(true);
      expect(state.dot).toBe('warning');
      expect(state.pillVisible).toBe(true);
    });

    test('contact fetch returning 401 propagates to session-expired (warning state)', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
        handlers: [
          [
            backendContactsModel.__test.fetchBackendContactsFx,
            vi.fn().mockRejectedValue(new HttpError(401, 'Unauthorized')),
          ],
        ],
      });

      await allSettled(backendContactsModel.__test.fetchBackendContactsFx, {
        scope,
        params: baseUrl,
      });

      const state = readIndicatorState(scope);

      expect(scope.getState(authModel.$isSessionExpired)).toBe(true);
      expect(state.dot).toBe('warning');
      expect(state.pillVisible).toBe(true);
    });
  });

  describe('network issue', () => {
    test('warning + reconnect pill when periodic session check fails (network down)', () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true)
          .set(authModel.$hasNetworkIssue, true),
      });

      const state = readIndicatorState(scope);

      expect(state.dot).toBe('warning');
      expect(state.pillVisible).toBe(true);
    });

    test('recovers to positive once network is back and the auto-refetch succeeds', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true)
          .set(authModel.$hasNetworkIssue, true),
        handlers: [[backendContactsModel.__test.fetchBackendContactsFx, vi.fn().mockResolvedValue([])]],
      });

      // Toggling $hasNetworkIssue to false fires the auto-refetch in backend-contacts-model.
      await allSettled(authModel.$hasNetworkIssue, { scope, params: false });

      const state = readIndicatorState(scope);

      expect(state.dot).toBe('positive');
      expect(state.pillVisible).toBe(false);
    });
  });

  describe('sync error', () => {
    test('warning + reconnect pill when contact sync fails with a non-auth error (e.g. 500)', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
        handlers: [
          [backendContactsModel.__test.fetchBackendContactsFx, vi.fn().mockRejectedValue(new HttpError(500, 'Boom'))],
        ],
      });

      await allSettled(backendContactsModel.__test.fetchBackendContactsFx, {
        scope,
        params: baseUrl,
      });

      const state = readIndicatorState(scope);

      // A 500 from contacts must NOT invalidate auth (no false logout). Only 401 does.
      expect(scope.getState(authModel.$isSessionExpired)).toBe(false);
      expect(scope.getState(backendContactsModel.$syncStatus)).toBe('error');
      expect(state.dot).toBe('warning');
      expect(state.pillVisible).toBe(true);
    });

    test('keeps positive dot during in-flight sync (syncStatus = "syncing")', async () => {
      let resolveFetch: ((value: unknown) => void) | undefined;
      const fetchSpy = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      );

      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
        handlers: [[backendContactsModel.__test.fetchBackendContactsFx, fetchSpy]],
      });

      const inFlight = allSettled(backendContactsModel.__test.fetchBackendContactsFx, {
        scope,
        params: baseUrl,
      });

      expect(scope.getState(backendContactsModel.$syncStatus)).toBe('syncing');
      const state = readIndicatorState(scope);
      expect(state.dot).toBe('positive');
      expect(state.pillVisible).toBe(false);

      resolveFetch?.([]);
      await inFlight;
    });
  });

  describe('sign-out', () => {
    test('default (grey) dot + reconnect pill after explicit sign-out', async () => {
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
        handlers: [[authModel.__test.logoutFx, vi.fn().mockResolvedValue(undefined)]],
      });

      await allSettled(authModel.events.signOutClicked, { scope });

      const state = readIndicatorState(scope);

      expect(scope.getState(authModel.$isAuthenticated)).toBe(false);
      // hasEverConnected is intentionally sticky — once the user has connected at least once,
      // the disconnected state is surfaced via the dot + pill so they can reconnect quickly.
      expect(scope.getState(connectionHistoryModel.$hasEverConnected)).toBe(true);
      expect(state.dot).toBe('default');
      expect(state.pillVisible).toBe(true);
    });
  });

  describe('URL cleared', () => {
    test('indicator stays visible after URL is cleared — hasEverConnected is sticky', async () => {
      // Regression guard: $hasEverConnected has no reset on urlCleared. The indicator stays
      // "disconnected" (grey dot + pill) even with no URL configured; the pill opens editStarted
      // which restores the editor with a blank draft. If product wants the indicator to disappear
      // on URL clear, this test should flip (not silently break).
      const scope = fork({
        values: new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true),
        handlers: [[authModel.__test.logoutFx, vi.fn().mockResolvedValue(undefined)]],
      });

      await allSettled(backendConfigurationModel.events.urlCleared, { scope });

      const state = readIndicatorState(scope);

      expect(scope.getState(backendConfigurationModel.$backendUrl)).toBeNull();
      expect(scope.getState(authModel.$isAuthenticated)).toBe(false);
      expect(scope.getState(connectionHistoryModel.$hasEverConnected)).toBe(true);
      expect(state.dot).toBe('default');
      expect(state.pillVisible).toBe(true);
    });
  });

  describe('state precedence', () => {
    test('warning beats positive: any single warning input wins over authenticated', () => {
      const variants: { expired?: boolean; network?: boolean; syncErr?: boolean }[] = [
        { expired: true },
        { network: true },
        { syncErr: true },
      ];

      for (const variant of variants) {
        const values = new Map()
          .set(backendConfigurationModel.$backendUrl, baseUrl)
          .set(authModel.$authState, authedState)
          .set(connectionHistoryModel.$hasEverConnected, true);
        if (variant.expired) values.set(authModel.$isSessionExpired, true);
        if (variant.network) values.set(authModel.$hasNetworkIssue, true);
        if (variant.syncErr) values.set(backendContactsModel.$syncStatus, 'error');

        const scope = fork({ values });
        const state = readIndicatorState(scope);

        expect(state.dot).toBe('warning');
        expect(state.pillVisible).toBe(true);
      }
    });
  });
});
