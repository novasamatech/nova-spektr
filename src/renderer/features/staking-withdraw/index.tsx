import { createFeature } from '@/shared/feature';
import { stakingWithdrawSlot } from '@/pages/Staking/slots';

import { Withdraw } from './components/Withdraw';
import { WithdrawShards } from './components/WithdrawShards';

export const stakingWithdrawFeature = createFeature({ name: 'staking/withdraw' });

stakingWithdrawFeature.inject(stakingWithdrawSlot, {
  render: () => (
    <>
      <Withdraw />
      <WithdrawShards />
    </>
  ),
});

export { withdrawFlow as withdrawModel } from './model/flow';
export { withdrawFlowShards as withdrawShardsModel } from './model/flow-shards';
