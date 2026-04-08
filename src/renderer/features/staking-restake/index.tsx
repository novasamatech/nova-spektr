import { createFeature } from '@/shared/feature';
import { stakingRestakeSlot } from '@/pages/Staking/slots';

import { Restake } from './components/Restake';
import { RestakeShards } from './components/RestakeShards';

export const stakingRestakeFeature = createFeature({ name: 'staking/restake' });

stakingRestakeFeature.inject(stakingRestakeSlot, {
  render: () => (
    <>
      <Restake />
      <RestakeShards />
    </>
  ),
});

export { restakeFlow as restakeModel } from './model/flow';
export { restakeFlowShards as restakeModelShards } from './model/flow-shards';
