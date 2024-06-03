import { Step } from './constants';

export const isNeedDisconnect = (step: Step) => {
  return step === Step.MANAGE || step === Step.REJECT;
};
