import { type Event, type Store, combine, createEvent, createStore, sample } from 'effector';

import { type Chain } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { proxyModel } from '@/entities/proxy';
import { accountUtils } from '@/entities/wallet';
import { graphModel } from '../model/graph-model';

import { createPathRouteStore } from './createPathRouteStore';

type Params = {
  initiator: Store<AnyAccount | null>;
  chain: Store<Chain | null>;
  /** Path resets on these signals (typically `formInitiated` / `flowFinished`). */
  resetOn: Event<unknown> | Event<unknown>[];
  /**
   * Additional triggers that flip `$userOverrodePath` back to false — e.g.
   * initiator change should re-seed the default path. `resetOn` already resets
   * the override flag, this is for everything beyond it.
   */
  resetUserOverrideOn?: Event<unknown> | Event<unknown>[];
  allowedProxyTypes?: readonly string[];
};

const toEvents = (input: Event<unknown> | Event<unknown>[] | undefined): Event<unknown>[] => {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
};

/**
 * Wires the standard signing-path stores for an operation form. Replaces the
 * ~80-line boilerplate that every form-model would otherwise duplicate:
 *
 * - `$signingPath` reset on form init
 * - `$userOverrodePath` flag that auto-seed obeys
 * - Default-path auto-seed via `graphModel.$defaultPathFor`
 * - `$signatoryFromPath` resolution
 * - Dropdown→path sync via `recomputeForSigner`
 *
 * No explicit return type — TS inference preserves the call-site `Event<T>`
 * markers that effector's `sample` typeguards rely on. Annotating the return
 * shape would erase those markers and trigger the "derived units are not
 * allowed in target" guard at every consumer.
 */
export function createSigningPathModel({ initiator, chain, resetOn, resetUserOverrideOn, allowedProxyTypes }: Params) {
  const resetEvents = toEvents(resetOn);
  const overrideResetEvents = [...resetEvents, ...toEvents(resetUserOverrideOn)];

  const signingPathChanged = createEvent<PathNode[]>();
  const recomputeForSigner = createEvent<AnyAccount | null>();

  let $signingPath = createStore<PathNode[]>([]).on(signingPathChanged, (_, path) => path);
  if (resetEvents.length > 0) $signingPath = $signingPath.reset(...resetEvents);

  let $userOverrodePath = createStore(false).on(signingPathChanged, () => true);
  if (overrideResetEvents.length > 0) $userOverrodePath = $userOverrodePath.reset(...overrideResetEvents);

  // Release the navigation-keyed cache in `graphModel` so it doesn't
  // accumulate entries across form lifecycles. Clears only the per-node
  // cache; the bounded sources / default-path caches stay so consumers'
  // subscriptions don't churn on every form init.
  if (resetEvents.length > 0) {
    sample({ clock: resetEvents, target: graphModel.nextOptionsCacheCleared });
  }

  const $chainId = chain.map((c) => c?.chainId ?? null);
  const $defaultSigningPath = graphModel.$defaultPathFor(initiator, $chainId, { allowedProxyTypes });

  sample({
    clock: $defaultSigningPath,
    source: $userOverrodePath,
    filter: (userOverrode) => !userOverrode,
    fn: (_, defaultPath) => defaultPath,
    target: $signingPath,
  });

  // Re-seed `$signingPath` from the current `$defaultSigningPath` value on
  // every form reset. Without this, re-opening a form left the path stuck at
  // `[]`: the seeding sample above only fires when `$defaultSigningPath`
  // *changes*, but `$defaultPathFor` is store-identity-cached and stably
  // holds the previously-computed real path across re-opens — so it never
  // emits on a fresh open. Subscription order matters: registered after
  // `$signingPath.reset(...resetEvents)`, this sample's write to
  // `$signingPath` lands after the reset in the same tick, so the path
  // ends the tick holding the freshly-read default. `$userOverrodePath` is
  // already cleared in the same tick (see `.reset(...overrideResetEvents)`
  // above), so unconditionally re-seeding here matches the not-overridden
  // semantics of the change-driven sample.
  if (resetEvents.length > 0) {
    sample({
      clock: resetEvents,
      source: $defaultSigningPath,
      target: $signingPath,
    });
  }

  const $signatoryFromPath = combine(
    { path: $signingPath, allAccounts: accounts.$list, chainValue: chain },
    ({ path, allAccounts, chainValue }): AnyAccount | null => {
      if (nullable(chainValue)) return null;
      const last = path.at(-1);
      if (!last || last.kind !== 'signer') return null;

      return (
        allAccounts.find(
          (a) => a.accountId === last.accountId && accountService.isAccountAvailableOnChain(a, chainValue),
        ) ?? null
      );
    },
  );

  sample({
    clock: recomputeForSigner,
    source: {
      initiatorValue: initiator,
      chainValue: chain,
      currentPath: $signingPath,
      multisigByAccountId: graphModel.$multisigByAccountId,
      proxies: proxyModel.$proxies,
      ownSignerAccountIds: graphModel.$ownSignerAccountIds,
      resolveName: graphModel.$nameResolver,
    },
    filter: ({ initiatorValue, chainValue, currentPath }, signatory) => {
      if (!initiatorValue || !chainValue || !signatory) return false;
      const last = currentPath.at(-1);
      if (last && last.kind === 'signer' && last.accountId === signatory.accountId) return false;
      // Only meaningful when the initiator is the kind that produces a path
      // (multisig or proxied). Regular accounts have no path to recompute.
      return accountUtils.isAnyMultisigAccount(initiatorValue) || accountUtils.isProxiedAccount(initiatorValue);
    },
    fn: (
      { initiatorValue, chainValue, multisigByAccountId, proxies, ownSignerAccountIds, resolveName },
      signatory,
    ): PathNode[] => {
      return graphModel.pickDefaultPath({
        initiator: initiatorValue!,
        chainId: chainValue!.chainId,
        multisigByAccountId,
        proxies,
        ownSignerAccountIds,
        resolveName,
        allowedProxyTypes,
        targetSigner: signatory!.accountId,
      });
    },
    target: signingPathChanged,
  });

  const $pathRoute = createPathRouteStore($signingPath, chain);

  return {
    $signingPath,
    signingPathChanged,
    $signatoryFromPath,
    recomputeForSigner,
    $pathRoute,
  };
}
