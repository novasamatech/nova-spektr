import { type Store } from 'effector';

import { type AnyAccount, accountService } from '@/domains/network';

/**
 * The account that will actually sign at the end of the route, or `null` when
 * the route terminates in an account that cannot sign (watch-only, contact) or
 * is empty. `null` means the flow must not offer a sign step.
 */
export const createRouteSignerStore = ($route: Store<AnyAccount[]>): Store<AnyAccount | null> => {
  return $route.map((route) => accountService.findSignatory(route));
};
