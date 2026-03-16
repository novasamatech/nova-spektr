import { createFeature } from '@/shared/feature';
import { stakingBondNominateSlot } from '@/pages/Staking/slots';

import { BondNominate } from './components/BondNominate';
import { BondNominateShards } from './components/BondNominateShards';

export const stakingBondNominateFeature = createFeature({ name: 'staking/bond-nominate' });

stakingBondNominateFeature.inject(stakingBondNominateSlot, {
  render: () => (
    <>
      <BondNominate />
      <BondNominateShards />
    </>
  ),
});

export { bondNominateFlow as bondNominateModel } from './model/flow';
export { bondNominateFlowShards as bondNominateModelShards } from './model/flow-shards';
