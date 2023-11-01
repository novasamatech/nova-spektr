import { Step } from './const';

export const isNeedDisconnect = (step: Step) => {
  return step === Step.MANAGE || step === Step.REJECT;
};
