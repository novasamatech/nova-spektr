import { createStore, merge, sample } from 'effector';
import { t } from 'i18next';
import { interval } from 'patronum';

import { type ChainId, type CreateDraftNotificationParams, NotificationType } from '@/shared/core';
import { pairwise } from '@/shared/effector';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Paths } from '@/shared/routes';
import { deepLinkService } from '@/domains/app';
import { type Draft, draftsResource, operationDescriptionsResource } from '@/domains/backend';
import { notificationModel } from '@/entities/notification';
import { authModel, backendConfigurationModel } from '@/aggregates/backend';

import { draftDeepLinkModel } from './draft-deep-link';

deepLinkService.registerHandler(draftDeepLinkModel.handler);

// Auto-fetch drafts + all operation descriptions on authentication
sample({
  clock: authModel.$authState,
  source: backendConfigurationModel.$backendUrl,
  filter: (url, authState): url is string => url !== null && authState !== null,
  fn: (baseUrl: string) => ({ baseUrl }),
  target: draftsResource.start,
});

sample({
  clock: authModel.$authState,
  source: backendConfigurationModel.$backendUrl,
  filter: (url, authState): url is string => url !== null && authState !== null,
  fn: (baseUrl: string) => baseUrl,
  target: operationDescriptionsResource.fetchAllFx,
});

// Poll drafts periodically while authenticated
const draftsPolling = interval({
  timeout: 30_000,
  start: authModel.events.signInSucceeded,
  stop: merge([authModel.events.signOutClicked, backendConfigurationModel.events.urlCleared]),
});

sample({
  clock: draftsPolling.tick,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  fn: (baseUrl: string) => ({ baseUrl }),
  target: draftsResource.start,
});

sample({
  clock: draftsPolling.tick,
  source: backendConfigurationModel.$backendUrl,
  filter: (url): url is string => url !== null,
  fn: (baseUrl: string) => baseUrl,
  target: operationDescriptionsResource.fetchAllFx,
});

// Clear on disconnect
sample({
  clock: backendConfigurationModel.events.urlCleared,
  target: draftsResource.resetDrafts,
});

// --- Draft change notifications ---

// Track IDs mutated locally so we can skip them in the diff.
// Local mutations (create/update/delete) fire these events, then the next
// backend fetch replaces the cache — at that point pairwise fires but
// the change was already handled by the user's own action.
const $locallyMutatedIds = createStore<Set<string>>(new Set());

$locallyMutatedIds
  .on(draftsResource.draftCreated, (set, draft) => new Set([...set, draft.id]))
  .on(draftsResource.draftUpdated, (set, draft) => new Set([...set, draft.id]))
  .on(draftsResource.draftDeleted, (set, id) => new Set([...set, id]));

type DraftDiff = {
  added: Draft[];
  removed: Draft[];
  updated: Draft[];
};

const draftChanges = pairwise(draftsResource.$cache).map(({ prev, current }): DraftDiff => {
  // Skip initial population (first fetch or reconnect after resetDrafts)
  if (prev.length === 0) return { added: [], removed: [], updated: [] };

  const prevMap = new Map(prev.map((d) => [d.id, d]));
  const currentMap = new Map(current.map((d) => [d.id, d]));

  const added: Draft[] = [];
  const updated: Draft[] = [];
  const removed: Draft[] = [];

  for (const draft of current) {
    const old = prevMap.get(draft.id);
    if (!old) {
      added.push(draft);
    } else if (old.updatedAt !== draft.updatedAt) {
      updated.push(draft);
    }
  }

  for (const draft of prev) {
    if (!currentMap.has(draft.id)) {
      removed.push(draft);
    }
  }

  return { added, removed, updated };
});

function createDraftNotification(draft: Draft, titleKey: string): CreateDraftNotificationParams {
  const draftLink = `${Paths.OPERATIONS}?draftId=${draft.id}`;

  return {
    key: `${NotificationType.DRAFT_CHANGE}-${draft.id}-${draft.updatedAt}`,
    type: NotificationType.DRAFT_CHANGE,
    status: 'info',
    issuer: (draft.multisigAccountId ?? '') as AccountId,
    chainId: draft.chainId as ChainId,
    title: t(titleKey),
    link: {
      title: t('operations.drafts.viewDraft'),
      path: draftLink,
    },
    batch: {
      title: t('operations.drafts.notifications.batch'),
      link: {
        title: t('operations.drafts.viewDraft'),
        path: Paths.OPERATIONS,
      },
    },
  };
}

sample({
  clock: draftChanges,
  source: $locallyMutatedIds,
  filter: (localIds, diff) => {
    return (
      diff.added.some((d) => !localIds.has(d.id)) ||
      diff.removed.some((d) => !localIds.has(d.id)) ||
      diff.updated.some((d) => !localIds.has(d.id))
    );
  },
  fn: (localIds, diff) => {
    const notifications: CreateDraftNotificationParams[] = [];

    for (const draft of diff.added) {
      if (localIds.has(draft.id)) continue;
      notifications.push(createDraftNotification(draft, 'operations.drafts.notifications.added'));
    }

    for (const draft of diff.updated) {
      if (localIds.has(draft.id)) continue;
      notifications.push(createDraftNotification(draft, 'operations.drafts.notifications.updated'));
    }

    for (const draft of diff.removed) {
      if (localIds.has(draft.id)) continue;
      notifications.push(createDraftNotification(draft, 'operations.drafts.notifications.removed'));
    }

    return notifications;
  },
  target: notificationModel.events.notificationsAdded,
});

// Remove from locally-mutated IDs only those that appeared in the diff
// (the backend confirmed the change, so we no longer need to suppress them)
sample({
  clock: draftChanges,
  source: $locallyMutatedIds,
  fn: (localIds, diff) => {
    const confirmed = new Set([
      ...diff.added.map((d) => d.id),
      ...diff.removed.map((d) => d.id),
      ...diff.updated.map((d) => d.id),
    ]);

    if (confirmed.size === 0) return localIds;

    const next = new Set(localIds);
    for (const id of confirmed) {
      next.delete(id);
    }

    return next;
  },
  target: $locallyMutatedIds,
});
