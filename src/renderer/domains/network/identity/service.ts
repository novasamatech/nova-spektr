import { nullable } from '@/shared/lib/utils';

import { type AccountIdentity } from './types';

function getFullIdentityName(identity: AccountIdentity): string {
  if (nullable(identity.subName)) {
    return identity.name;
  }

  return `${identity.name}/${identity.subName}`;
}

export const identityService = {
  getFullIdentityName,
};
