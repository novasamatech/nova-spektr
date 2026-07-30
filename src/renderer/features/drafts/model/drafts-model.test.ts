import { type Scope, allSettled, createWatch, fork } from 'effector';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { storageService } from '@/shared/api/storage';
import { type ChainId, NotificationType } from '@/shared/core';
import { type Draft, draftsResource, draftsService } from '@/domains/backend';
import { notificationModel } from '@/entities/notification';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

// Imported for its side effects: the module wires poll → diff → notifications on load.
import './drafts-model';

const CHAIN = `0x${'11'.repeat(32)}` as ChainId;

const makeDraft = (id: string, updatedAt = '2026-01-01T00:00:00Z'): Draft => ({
  id,
  operation: null,
  multisigAccountId: null,
  chainId: CHAIN,
  callData: null,
  description: `draft ${id}`,
  createdBy: 'creator',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt,
  signingPath: [],
  initiatorAccountId: null,
});

// A finished backend fetch replaces `$cache` wholesale. `resource.push` / `$cache`
// are readonly-wrapped, so drive the real fetch path: `start` + a mocked service.
// The resource's request cache lives outside the effector scope and is keyed on the
// url — a distinct url per call keeps every fetch on its own cache key.
let urlCounter = 0;

const fetchArrived = async (scope: Scope, drafts: Draft[]) => {
  vi.spyOn(draftsService, 'fetchDrafts').mockResolvedValue(drafts);
  await allSettled(draftsResource.start, { scope, params: { baseUrl: `https://backend-${urlCounter++}.test` } });
};

const watchNotifications = (scope: Scope) => {
  const listener = vi.fn();
  createWatch({ unit: notificationModel.events.notificationsAdded, fn: listener, scope });

  return listener;
};

const draftKey = (draft: Draft) => `${NotificationType.DRAFT_CHANGE}-${draft.id}-${draft.updatedAt}`;

describe('draftsModel · poll diff → notifications', () => {
  beforeEach(() => {
    vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('first fetch is initial population — cache fills, no notifications', async () => {
    const scope = fork();
    const listener = watchNotifications(scope);

    const drafts = [makeDraft('d1'), makeDraft('d2')];
    await fetchArrived(scope, drafts);

    expect(scope.getState(draftsResource.$cache)).toEqual(drafts);
    expect(scope.getState(draftsResource.$loaded)).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it('a draft added by another client raises exactly one change notification', async () => {
    const scope = fork();
    const existing = makeDraft('d1');
    await fetchArrived(scope, [existing]);

    const listener = watchNotifications(scope);
    const added = makeDraft('d2');
    await fetchArrived(scope, [existing, added]);

    expect(listener).toHaveBeenCalledTimes(1);
    const notifications = listener.mock.calls[0]?.[0];
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: NotificationType.DRAFT_CHANGE,
      status: 'info',
      key: draftKey(added),
      chainId: CHAIN,
    });
  });

  it('a remotely updated draft (new updatedAt) raises a change notification', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);

    const listener = watchNotifications(scope);
    const updated = makeDraft('d1', '2026-02-02T00:00:00Z');
    await fetchArrived(scope, [updated]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ key: draftKey(updated) })]);
  });

  it('a remotely removed draft raises a change notification', async () => {
    const scope = fork();
    const kept = makeDraft('d1');
    const removed = makeDraft('d2');
    await fetchArrived(scope, [kept, removed]);

    const listener = watchNotifications(scope);
    await fetchArrived(scope, [kept]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ key: draftKey(removed) })]);
  });
});

describe('draftsModel · self-mutation de-duplication', () => {
  beforeEach(() => {
    vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('own create is suppressed in the diff', async () => {
    const scope = fork();
    const existing = makeDraft('d1');
    await fetchArrived(scope, [existing]);

    const listener = watchNotifications(scope);
    const created = makeDraft('d2');
    await allSettled(draftsResource.draftCreated, { scope, params: created });

    expect(scope.getState(draftsResource.$cache)).toEqual([existing, created]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('own update is suppressed in the diff', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);

    const listener = watchNotifications(scope);
    await allSettled(draftsResource.draftUpdated, { scope, params: makeDraft('d1', '2026-02-02T00:00:00Z') });

    expect(listener).not.toHaveBeenCalled();
  });

  it('own delete is suppressed in the diff', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);

    const listener = watchNotifications(scope);
    await allSettled(draftsResource.draftDeleted, { scope, params: 'd1' });

    expect(scope.getState(draftsResource.$cache)).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('suppression is lifted after the diff confirms the change — a later remote change notifies again', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);

    // Local edit: lands in $locallyMutatedIds, the immediate diff is suppressed
    // and the confirmation cleanup removes d1 from the suppression set.
    await allSettled(draftsResource.draftUpdated, { scope, params: makeDraft('d1', '2026-02-02T00:00:00Z') });

    const listener = watchNotifications(scope);
    const remoteChange = makeDraft('d1', '2026-03-03T00:00:00Z');
    await fetchArrived(scope, [remoteChange]);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toEqual([expect.objectContaining({ key: draftKey(remoteChange) })]);
  });
});

describe('draftsModel · cache reset', () => {
  beforeEach(() => {
    vi.spyOn(storageService.notifications, 'readAll').mockResolvedValue([]);
    vi.spyOn(storageService.notifications, 'createAll').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('urlCleared resets the drafts cache and the loaded flag', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);
    expect(scope.getState(draftsResource.$loaded)).toBe(true);

    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(draftsResource.$cache)).toEqual([]);
    expect(scope.getState(draftsResource.$loaded)).toBe(false);
  });

  it('urlCleared empties a populated cache without raising removed notifications', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1'), makeDraft('d2')]);

    const listener = watchNotifications(scope);
    await allSettled(backendConfigurationModel.events.urlCleared, { scope });

    expect(scope.getState(draftsResource.$cache)).toEqual([]);
    expect(listener).not.toHaveBeenCalled();
  });

  it('signOutClicked resets the drafts cache silently', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1')]);
    expect(scope.getState(draftsResource.$loaded)).toBe(true);

    const listener = watchNotifications(scope);
    await allSettled(authModel.events.signOutClicked, { scope });

    expect(scope.getState(draftsResource.$cache)).toEqual([]);
    expect(scope.getState(draftsResource.$loaded)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('the first fetch after a reset is treated as initial population — no notification spam', async () => {
    const scope = fork();
    await fetchArrived(scope, [makeDraft('d1'), makeDraft('d2')]);
    await allSettled(draftsResource.resetDrafts, { scope });
    expect(scope.getState(draftsResource.$cache)).toEqual([]);

    const listener = watchNotifications(scope);
    const repopulated = [makeDraft('d3'), makeDraft('d4')];
    await fetchArrived(scope, repopulated);

    expect(scope.getState(draftsResource.$cache)).toEqual(repopulated);
    expect(listener).not.toHaveBeenCalled();
  });
});
