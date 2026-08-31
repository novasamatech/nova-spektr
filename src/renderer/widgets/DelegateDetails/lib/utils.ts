import { default as BigNumber } from 'bignumber.js';
import { capitalize } from 'lodash';

import { type Delegation } from '@/shared/api/governance/off-chain/lib/types';
import { type Identity } from '@/shared/core';
import { entries, toWebUrl } from '@/shared/lib/utils';
import { votingService } from '@/entities/governance';

// A bare `local@domain` address: no whitespace and none of `? & # /`, which would
// smuggle mailto header fields or a path into the link built from on-chain data.
const BARE_EMAIL = /^[^\s@?&#/]+@[^\s@?&#/]+$/;

const toMailtoUrl = (email: string): string | null => {
  if (!BARE_EMAIL.test(email)) return null;

  return `mailto:${email.split('@').map(encodeURIComponent).join('@')}`;
};

type IdentityListParam = {
  key: string;
  value: string;
  url: string;
};

export const getIdentityList = (identity: Identity) => {
  return entries(identity).reduce<IdentityListParam[]>((acc, [key, value]) => {
    if (typeof value !== 'string' || !value) return acc;
    const capitalizedKey = capitalize(key);

    switch (key) {
      case 'twitter':
        return [...acc, { key: capitalizedKey, value, url: `https://x.com/${value}` }];
      case 'email': {
        const url = toMailtoUrl(value);

        return url ? [...acc, { key: capitalizedKey, value, url }] : acc;
      }
      case 'website': {
        const url = toWebUrl(value);

        return url ? [...acc, { key: capitalizedKey, value, url }] : acc;
      }
      case 'parent':
        return acc;
      default:
        return [...acc, { key: capitalizedKey, value: value, url: '' }];
    }
  }, []);
};

export const getDelegationsList = (delegations: Delegation[]) => {
  const map = new Map();

  for (const delegation of delegations) {
    const delegator = map.get(delegation.delegator);
    const multiplier = votingService.getConvictionMultiplier(delegation.delegation.conviction);
    const multipliedAmount = new BigNumber(delegation.delegation.amount).multipliedBy(new BigNumber(multiplier));

    map.set(delegation.delegator, {
      tracks: delegator ? [...delegator.tracks, delegation.trackId] : [delegation.trackId],
      amount: delegator ? delegator.amount.plus(multipliedAmount) : multipliedAmount,
    });
  }

  return Array.from(map).sort((a, b) => b[1].amount.comparedTo(a[1].amount));
};
