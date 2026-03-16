import { createFeature } from '@/shared/feature';
import { stakingPayeeSlot } from '@/pages/Staking/slots';

import { Payee } from './components/Payee';
import { PayeeShards } from './components/PayeeShards';

export const stakingPayeeFeature = createFeature({ name: 'staking/payee' });

stakingPayeeFeature.inject(stakingPayeeSlot, {
  render: () => (
    <>
      <Payee />
      <PayeeShards />
    </>
  ),
});

export { payeeFlow as payeeModel } from './model/flow';
export { payeeFlowShards as payeeModelShards } from './model/flow-shards';
