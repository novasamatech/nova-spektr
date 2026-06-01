import { createEvent, createStore } from 'effector';

import { type Chain } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type ActiveOperation = {
  route: AnyAccount[];
  chain: Chain | null;
};

/**
 * Resolved signing-path accounts (and chain) of the operation whose confirm is
 * currently on screen. Published by the transaction/extrinsic confirm-store
 * factories so cross-cutting consumers (e.g. the multisig-operation description
 * aggregate) can inspect the path — including a multisig reached via a proxy —
 * without prop-drilling through every confirm screen.
 *
 * Only one operation confirm is shown at a time, and every confirm built via
 * the factories republishes itself when its store changes, so this reflects the
 * confirm currently being shown.
 */
const activeOperationChanged = createEvent<ActiveOperation>();

const $activeOperationRoute = createStore<AnyAccount[]>([]).on(activeOperationChanged, (_, { route }) => route);

const $activeOperationChain = createStore<Chain | null>(null).on(activeOperationChanged, (_, { chain }) => chain);

export const activeOperationRoute = {
  $activeOperationRoute,
  $activeOperationChain,
  activeOperationChanged,
};
