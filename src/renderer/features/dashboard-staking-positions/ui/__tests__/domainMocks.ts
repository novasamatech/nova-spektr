import { createStore } from 'effector';

import { type UnclaimedPayouts } from '@/domains/staking';

/**
 * A payout answer to hand the rows instead of the one the domain would fetch.
 * `null` leaves the real `useUnclaimedPayouts` in charge. Only type imports
 * above, so this module stays outside the mocked module's runtime graph.
 */
export const $unclaimedPayoutsOverride = createStore<{ data: UnclaimedPayouts; pending: boolean } | null>(null);
