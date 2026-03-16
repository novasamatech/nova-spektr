import { createFeature } from '@/shared/feature';
import { stakingBondExtraSlot } from '@/pages/Staking/slots';

import { BondExtra } from './components/BondExtra';
import { BondExtraShards } from './components/BondExtraShards';

export const stakingBondExtraFeature = createFeature({ name: 'staking/bond-extra' });

stakingBondExtraFeature.inject(stakingBondExtraSlot, {
  render: () => (
    <>
      <BondExtra />
      <BondExtraShards />
    </>
  ),
});

export { bondExtraFlow as bondExtraModel } from './model/flow';
export { bondExtraFlowShards as bondExtraShardsModel } from './model/flow-shards';
