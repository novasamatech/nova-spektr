import { createEvent, createStore, sample } from 'effector';
import { createGate } from 'effector-react';
import { persist } from 'effector-storage/local';

import { type Alert } from '../types';

const gate = createGate<Alert[]>({ defaultState: [] });
const $alerts = gate.state;

const $alertsWereSeen = createStore<Record<string, boolean>>({});

persist({
  key: 'fellowship-profile-alertsWereSeen',
  store: $alertsWereSeen,
  sync: true,
});

const markAsSeen = createEvent<string>();
const markAllAsSeen = createEvent();

sample({
  clock: markAsSeen,
  source: $alertsWereSeen,
  fn: (seen, id) => ({ ...seen, [id]: true }),
  target: $alertsWereSeen,
});

sample({
  clock: markAllAsSeen,
  source: { alerts: $alerts, alertsWereSeen: $alertsWereSeen },
  fn: ({ alerts, alertsWereSeen }) => ({
    ...alertsWereSeen,
    ...Object.fromEntries(alerts.map(alert => [alert.id, true])),
  }),
  target: $alertsWereSeen,
});

/**
 * On first load, we should mark all alerts as seen because they are not new to
 * the user.
 */
const $shouldMarkAlertsAsSeen = createStore(true);

persist({
  key: 'fellowship-profile-firstTimeAlertsMarkedSeen',
  store: $shouldMarkAlertsAsSeen,
  sync: true,
});

sample({
  clock: $alerts,
  source: $shouldMarkAlertsAsSeen,
  filter: (shouldMarkAlertsAsSeen, alerts) => shouldMarkAlertsAsSeen && alerts.length > 0,
  fn: () => false,
  target: [$shouldMarkAlertsAsSeen, markAllAsSeen],
});

export const alertsModel = {
  gate,
  $alertsWereSeen,
  markAsSeen,
  markAllAsSeen,
};
