import { type ApiPromise } from '@polkadot/api';

import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const stakingPallet = {
  consts,
  schema,
  storage,
  supportedOn(api: ApiPromise) {
    return 'staking' in api.query;
  },
};

export type {
  StakingActiveEraInfo,
  StakingEraRewardPoints,
  StakingExposurePage,
  StakingLedger,
  StakingNominations,
  StakingPagedExposureMetadata,
  StakingRewardDestination,
  StakingSlashingSpans,
  StakingUnappliedSlash,
  StakingValidatorPrefs,
} from './schema';
