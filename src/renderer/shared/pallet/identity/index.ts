import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const identityPallet = {
  consts,
  schema,
  storage,
};

export type {
  IdentityJudgement,
  IdentityLegacyIdentityInfo,
  IdentityRegistrarInfo,
  IdentityRegistration,
} from './schema';
