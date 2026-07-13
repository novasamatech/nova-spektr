import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import { vestingPortfolioModel } from '@/aggregates/vesting-portfolio';

import { AccountScheduleModal } from './AccountScheduleModal';
import { ClaimFlow } from './ClaimFlow';
import { VestingCallout } from './VestingCallout';
import { VestingScheduleModal } from './VestingScheduleModal';

/**
 * The vesting block, as injected into the Portfolio Overview card.
 *
 * It subscribes to nothing itself: every child reads exactly the stores it
 * prints, so a new block height or a balance refresh can only re-render the
 * parts whose figures actually changed — and never the claim flow, which a user
 * may be signing at that moment.
 */
export const VestingRoot = () => {
  // Wiring the events through `useUnit` binds them to the current scope; neither
  // subscribes this component to a store, so this never re-renders.
  const [activated, deactivated] = useUnit([vestingPortfolioModel.activated, vestingPortfolioModel.deactivated]);

  useEffect(() => {
    activated();

    return deactivated;
  }, [activated, deactivated]);

  return (
    <>
      <VestingCallout />
      <VestingScheduleModal />
      <AccountScheduleModal />
      <ClaimFlow />
    </>
  );
};
