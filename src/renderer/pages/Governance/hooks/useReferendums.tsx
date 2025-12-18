import { useGate, useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type ReferendumId } from '@/shared/core';
import { governancePageAggregate } from '../aggregates/governancePage';

export const useReferendum = (referendumId: ReferendumId) => {
  useGate(governancePageAggregate.gates.flow);

  const currentReferendums = useUnit(governancePageAggregate.$currentReferendums);

  const referendum = useMemo(() => {
    return currentReferendums.find((referendum) => referendum.referendumId === referendumId) ?? null;
  }, [currentReferendums, referendumId]);

  return referendum;
};
