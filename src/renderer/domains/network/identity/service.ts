import { type AccountIdentity } from './types';

/**
 * Identity name with its sub-identity name, if any. Either part can be empty
 * (e.g. a name made only of invisible characters), so empty parts are skipped
 * and an identity without a visible name yields an empty string.
 */
function getFullName(identity: AccountIdentity): string {
  return [identity.name, identity.subName].filter(Boolean).join(' / ');
}

export const identityService = {
  getFullName,
};
