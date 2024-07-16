import { BN_ZERO } from '@polkadot/util';

import type { IVotingThreshold, SupportParams, AyesParams } from '../lib/threshold-types';
import type { VotingThreshold } from '@shared/core';

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
