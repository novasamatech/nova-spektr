import { type ApiPromise } from '@polkadot/api';

import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const identityPallet = {
  consts,
  schema,
  storage,
  supportedOn(api: ApiPromise) {
    return 'identity' in api.query;
  },
};

export type {
  IdentityJudgement,
  IdentityLegacyIdentityInfo,
  IdentityRegistrarInfo,
  IdentityRegistration,
} from './schema';
