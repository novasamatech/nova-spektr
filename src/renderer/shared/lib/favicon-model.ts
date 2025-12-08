import { createEffect, createEvent, createStore, sample } from 'effector';

import faviconDev from '@/app/favicon.dev.png';
import faviconProd from '@/app/favicon.png';
import { notificationModel } from '@/entities/notification';

import { drawFaviconBadge } from './favicon';

// Get the original favicon path based on environment
const ORIGINAL_FAVICON = import.meta.env.DEV ? faviconDev : faviconProd;

/**
 * Effect to update favicon with or without badge
 */
const updateFaviconFx = createEffect(async (showBadge: boolean): Promise<string> => {
  return drawFaviconBadge(ORIGINAL_FAVICON, showBadge);
});

/**
 * Store for the current favicon URL
 */
export const $faviconUrl = createStore<string>(ORIGINAL_FAVICON);

/**
 * Event to initialize favicon
 */
const faviconInitialized = createEvent();

// Update favicon URL when the effect completes
sample({
  clock: updateFaviconFx.doneData,
  target: $faviconUrl,
});

// Trigger favicon update when hasUnread changes
sample({
  clock: notificationModel.$hasUnread,
  fn: (hasUnread) => hasUnread,
  target: updateFaviconFx,
});

// Initialize favicon on app start
sample({
  clock: faviconInitialized,
  source: notificationModel.$hasUnread,
  fn: (hasUnread) => hasUnread,
  target: updateFaviconFx,
});

// Update when notifications are loaded
sample({
  clock: notificationModel.events.notificationsStarted.doneData,
  source: notificationModel.$hasUnread,
  fn: (hasUnread) => hasUnread,
  target: updateFaviconFx,
});

export const faviconModel = {
  $faviconUrl,
  $showFaviconBadge: notificationModel.$hasUnread,
  events: {
    faviconInitialized,
  },
};
