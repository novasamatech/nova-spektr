import capitalize from 'lodash/capitalize';

import { type Identity } from '@/shared/core';

export const getIdentityList = (identity: Identity) => {
  return Object.entries(identity).reduce<{ key: string; value: string }[]>((acc, [key, value]) => {
    if (key === 'parent' || !value) return acc;

    acc.push({ key: capitalize(key), value: value as string }); // Store both key and value explicitly

    return acc;
  }, []);
};
