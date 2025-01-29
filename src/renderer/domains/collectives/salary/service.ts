import { type BlockHeight, pjsSchema } from '@/shared/polkadotjs-schemas';

import { type SalaryCycleStatus } from './types';

function getCurrentPeriod(status: SalaryCycleStatus, currentBlock: BlockHeight) {
  const cycleEnd = getCycleEnd(status);

  if (currentBlock < status.cycleStart || currentBlock > cycleEnd) {
    return {
      type: 'unknown',
      cycleIndex: status.cycleIndex,
    } as const;
  }

  const payoutStart = status.cycleStart + status.registrationPeriod;

  if (currentBlock >= payoutStart) {
    return {
      type: 'payout',
      left: pjsSchema.helpers.toBlockHeight(cycleEnd - currentBlock),
      until: pjsSchema.helpers.toBlockHeight(cycleEnd),
      cycleIndex: status.cycleIndex,
    } as const;
  }

  return {
    type: 'registration',
    left: pjsSchema.helpers.toBlockHeight(payoutStart - currentBlock),
    until: pjsSchema.helpers.toBlockHeight(payoutStart),
    cycleIndex: status.cycleIndex,
  } as const;
}

function getCycleEnd(status: SalaryCycleStatus) {
  return pjsSchema.helpers.toBlockHeight(status.cycleStart + status.registrationPeriod + status.payoutPeriod);
}

export const salaryService = {
  getCycleEnd,
  getCurrentPeriod,
};
