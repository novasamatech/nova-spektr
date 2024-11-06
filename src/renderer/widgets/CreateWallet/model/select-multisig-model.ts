import { combine, createEvent, restore, sample } from 'effector';

import { flexibleMultisigModel } from '@/features/flexible-multisig';
import { MultisigWalletType } from '../ui/MultisigWallet/common/constants';

import { flowModel } from './flow-model';

const flowFinished = createEvent();
const selectMultisigType = createEvent<MultisigWalletType>();

const $selectedType = restore(selectMultisigType, null).reset(flowFinished);

const $step = combine(
  { regularStep: flowModel.$step, flexibleStep: flexibleMultisigModel.$step, selectedType: $selectedType },
  ({ regularStep, flexibleStep, selectedType }) => {
    return selectedType === MultisigWalletType.REGULAR ? regularStep : flexibleStep;
  },
);

sample({
  clock: flowFinished,
  target: [flowModel.output.flowFinished, flexibleMultisigModel.output.flowFinished],
});

export const selectMultisigModel = {
  $step,

  events: {
    selectMultisigType,
    flowFinished,
  },
};
