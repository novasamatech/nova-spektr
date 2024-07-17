import { BN_ZERO } from '@polkadot/util';

import type { VotingThreshold } from '@shared/core';
import type { AyesParams, IVotingThreshold, SupportParams } from '../lib/threshold-types';

export const fellowshipThresholdService: IVotingThreshold = {
  supportThreshold,
  ayesFractionThreshold,
};

function supportThreshold(params: SupportParams): VotingThreshold {
  return { value: BN_ZERO, passing: false, curve: null };
}

function ayesFractionThreshold(params: AyesParams): VotingThreshold {
  return { value: BN_ZERO, passing: false, curve: null };
}
