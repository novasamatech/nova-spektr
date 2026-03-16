import { createFeature } from '@/shared/feature';
import { stakingNominateSlot } from '@/pages/Staking/slots';

import { Nominate } from './components/Nominate';
import { NominateShards } from './components/NominateShards';

export const stakingNominateFeature = createFeature({ name: 'staking/nominate' });

stakingNominateFeature.inject(stakingNominateSlot, {
  render: () => (
    <>
      <Nominate />
      <NominateShards />
    </>
  ),
});

export { nominateFlow as nominateModel } from './model/flow';
export { nominateFlowShards as nominateShardsModel } from './model/flow-shards';
