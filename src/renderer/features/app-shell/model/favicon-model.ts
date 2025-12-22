import { createEvent, createStore, sample } from 'effector';

const $badgeSources = createStore<Set<string>>(new Set());
const $hasBadge = $badgeSources.map((sources) => sources.size > 0);

const badgeSourceAdded = createEvent<string>();
const badgeSourceRemoved = createEvent<string>();

sample({
  clock: badgeSourceAdded,
  source: $badgeSources,
  fn: (sources, key) => new Set([...sources, key]),
  target: $badgeSources,
});

sample({
  clock: badgeSourceRemoved,
  source: $badgeSources,
  fn: (sources, key) => {
    const next = new Set(sources);
    next.delete(key);

    return next;
  },
  target: $badgeSources,
});

export const faviconModel = {
  $hasBadge,
  events: {
    badgeSourceAdded,
    badgeSourceRemoved,
  },
};
