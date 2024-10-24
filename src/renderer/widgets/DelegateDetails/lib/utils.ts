import { default as BigNumber } from 'bignumber.js';
import capitalize from 'lodash/capitalize';

import { type Delegation } from '@/shared/api/governance/off-chain/lib/types';
import { type Identity } from '@/shared/core';
import { votingService } from '@/entities/governance';

type IdentityListParam = {
  key: string;
  value: string;
  url: string;
};

export const getIdentityList = (identity: Identity) => {
  return Object.entries(identity).reduce<IdentityListParam[]>((acc, [key, value]) => {
    if (typeof value !== 'string' || !value) return acc;
    const capitalizedKey = capitalize(key);

    switch (key) {
      case 'twitter':
        return [...acc, { key: capitalizedKey, value, url: `https://x.com/${value}` }];
      case 'email':
        return [...acc, { key: capitalizedKey, value, url: `mailto:${value}` }];
      case 'website':
        return [...acc, { key: capitalizedKey, value, url: value }];
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
