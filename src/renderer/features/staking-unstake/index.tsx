import { createFeature } from '@/shared/feature';
import { stakingUnstakeSlot } from '@/pages/Staking/slots';

import { Unstake } from './components/Unstake';
import { UnstakeShards } from './components/UnstakeShards';

export const stakingUnstakeFeature = createFeature({ name: 'staking/unstake' });

stakingUnstakeFeature.inject(stakingUnstakeSlot, {
  render: () => (
    <>
      <Unstake />
      <UnstakeShards />
    </>
  ),
});

export { unstakeFlow as unstakeModel } from './model/flow';
export { unstakeFlowShards as unstakeModelShards } from './model/flow-shards';
