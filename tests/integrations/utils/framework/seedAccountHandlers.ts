import { type Scope, allSettled } from 'effector';

import { type Chain, SigningType } from '@/shared/core';
import { type AnyAccount, accountService } from '@/domains/network';

const availabilityHandler = {
  body: ({ account, chain }: { account: AnyAccount; chain: Chain }) =>
    accountService.isChainAccount(account) ? account.chainId === chain.chainId : true,
  available: () => true,
};

const permissionHandler = {
  body: ({ account }: { account: AnyAccount }) => account.signingType !== SigningType.WATCH_ONLY,
  available: () => true,
};

/**
 * DI handlers register through unscoped events at module import, so a fork
 * scope starts with an empty registry and the production handlers' feature
 * gating reads `idle` status — every availability/permission check under test
 * silently returns false. These stubs restore sane defaults: chain accounts are
 * available on their own chain, universal accounts everywhere, and everything
 * except watch-only can sign.
 *
 * Pass the fork `scope` when the model reads handlers from pure computations
 * (combines/samples) — `getState` resolves to the scope registry there. Call
 * without a scope when the model reads them from effect handlers or plain
 * service calls, which resolve to the unscoped registry; in that case reset the
 * global registry in `afterEach` via resetAccountHandlers.
 */
export const seedAccountHandlers = async (scope?: Scope) => {
  if (scope) {
    await allSettled(accountService.accountAvailabilityOnChainAnyOf.registerHandler, {
      scope,
      params: availabilityHandler,
    });
    await allSettled(accountService.accountActionPermissionAnyOf.registerHandler, {
      scope,
      params: permissionHandler,
    });
  } else {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler(availabilityHandler);
    accountService.accountActionPermissionAnyOf.registerHandler(permissionHandler);
  }
};

/**
 * Clears unscoped registrations made by seedAccountHandlers() so they don't
 * leak into other tests in the same file. Only needed for the unscoped mode.
 */
export const resetAccountHandlers = () => {
  accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
  accountService.accountActionPermissionAnyOf.resetHandlers();
};
