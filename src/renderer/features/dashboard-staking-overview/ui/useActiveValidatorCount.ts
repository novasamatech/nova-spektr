import { type ApiPromise } from '@polkadot/api';
import { useEffect, useRef, useState } from 'react';

import { type EraIndex } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type StakingMap } from '@/entities/staking';

type ActiveValidatorCountResult = {
  count: number | undefined;
  pending: boolean;
};

function isOldRuntime(api: ApiPromise): boolean {
  return Boolean(api.consts.staking.maxNominatorRewardedPerValidator);
}

export function useActiveValidatorCount(
  api: ApiPromise | null,
  stakingData: StakingMap,
  accountIds: AccountId[],
  era: EraIndex | undefined,
): ActiveValidatorCountResult {
  const [count, setCount] = useState<number | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const stashes = accountIds.filter((id) => {
      const stake = stakingData[id];

      return stake && BigInt(stake.total) > 0n;
    });

    if (!api || era === undefined || stashes.length === 0) {
      setCount(undefined);
      setPending(false);

      return;
    }

    const currentFetchId = ++fetchIdRef.current;
    setPending(true);

    (async () => {
      try {
        const validatorQuery = isOldRuntime(api)
          ? api.query.staking.erasStakersClipped.keys(era)
          : api.query.staking.erasStakersOverview.keys(era);

        const [validatorKeys, nominatorResults] = await Promise.all([
          validatorQuery,
          api.query.staking.nominators.multi(stashes),
        ]);

        if (currentFetchId !== fetchIdRef.current) return;

        const activeValidatorSet = new Set(validatorKeys.map((key) => String(toAccountId(key.args[1].toString()))));

        const nominatedTargets = new Set<string>();
        for (const data of nominatorResults) {
          if (data.isNone) continue;
          for (const target of data.unwrap().targets.toArray()) {
            const targetId = toAccountId(target.toString());
            nominatedTargets.add(String(targetId));
          }
        }

        let activeCount = 0;
        for (const target of nominatedTargets) {
          if (activeValidatorSet.has(target)) {
            activeCount++;
          }
        }

        setCount(activeCount);
      } catch (error) {
        console.warn('Failed to fetch active validator count:', error);
        if (currentFetchId === fetchIdRef.current) {
          setCount(undefined);
        }
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setPending(false);
        }
      }
    })();
  }, [api, stakingData, accountIds, era]);

  return { count, pending };
}
