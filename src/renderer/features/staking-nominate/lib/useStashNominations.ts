import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useNominations } from '@/domains/staking';
import { networkModel } from '@/entities/network';

/**
 * Subscribes to what the flow's stashes nominate today, for as long as the flow
 * is open.
 *
 * The picker opens on the current nomination set — that is the whole point of
 * "change validators", since the common edit is dropping one operator rather
 * than rebuilding sixteen. The flow reads that set out of the nominations cache
 * when it hands control to the picker, and **nothing else on the Staking page
 * fills that cache**: the dashboard subscribes to nominations, so reading the
 * cache alone looked fine until someone opened this flow without visiting the
 * dashboard first, and then the picker silently opened with nothing checked.
 *
 * Mounted with the flow rather than with the picker, so the answer is already
 * in the cache by the time the user reaches the validator step.
 */
export const useStashNominations = (chain: Chain | null | undefined, stashes: AccountId[] | null | undefined) => {
  const apis = useUnit(networkModel.$apis);

  const chainId = chain?.chainId ?? null;
  const api = chainId ? (apis[chainId] ?? null) : null;

  // The two nominate flows hold their accounts in different shapes, so callers
  // pass the ids. Memoised on their content, not their identity: a fresh array
  // from an unrelated re-render must not look like a different subscription.
  const key = stashes?.join('_') ?? '';
  const scopedStashes = useMemo(() => stashes ?? null, [key]);

  useNominations({ chainId, api, stashes: scopedStashes });
};
