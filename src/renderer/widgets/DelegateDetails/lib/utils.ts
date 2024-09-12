import capitalize from 'lodash/capitalize';

import { type Identity } from '@/shared/core';

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
