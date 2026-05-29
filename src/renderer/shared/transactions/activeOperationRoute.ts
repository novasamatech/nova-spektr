import { createEvent, createStore } from 'effector';

import { type AnyAccount } from '@/domains/network';

/**
 * Resolved signing-path accounts of the operation whose confirm is currently on
 * screen. Published by the transaction/extrinsic confirm-store factories so
 * cross-cutting consumers (e.g. the multisig-operation description aggregate)
 * can inspect the path — including a multisig reached via a proxy — without
 * prop-drilling through every confirm screen.
 *
 * Only one operation confirm is shown at a time, and every confirm built via
 * the factories republishes its route when its store changes, so this reflects
 * the confirm currently being shown.
 */
const activeRouteChanged = createEvent<AnyAccount[]>();

const $activeOperationRoute = createStore<AnyAccount[]>([]).on(activeRouteChanged, (_, route) => route);

export const activeOperationRoute = {
  $activeOperationRoute,
  activeRouteChanged,
};
