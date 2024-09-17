import BN from 'bignumber.js';
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
    const currentMap = map.get(delegation.delegator);
    const multiplier = votingService.getConvictionMultiplier(delegation.delegation.conviction);

    if (!currentMap) {
      map.set(delegation.delegator, {
        tracks: [delegation.trackId],
        amount: new BN(delegation.delegation.amount).multipliedBy(new BN(multiplier)),
      });

      continue;
    }

    map.set(delegation.delegator, {
      tracks: [...currentMap.tracks, delegation.trackId],
      amount: currentMap.amount.plus(new BN(delegation.delegation.amount).multipliedBy(new BN(multiplier))),
    });
  }

  return Array.from(map).sort((a, b) => b[1].amount.comparedTo(a[1].amount));
};
