import { BN } from '@polkadot/util';

import { type Serializable } from '../../core';

export const pickNestedValue = <T extends string, V>(
  map: Record<string, Record<T, V>>,
  outerKey: string,
  innerKey: T,
): V | null => {
  return map[outerKey]?.[innerKey] ?? null;
};

export const setNestedValue = <T extends string, V>(
  map: Record<string, Record<T, V>>,
  outerKey: string,
  innerKey: T,
  value: V,
): Record<string, Record<T, V>> => {
  return {
    ...map,
    [outerKey]: {
      ...(map[outerKey] ?? {}),
      [innerKey]: value,
    },
  };
};

export const toSerializable = <T>(value: T): Serializable<T> => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined' ||
    value === null
  ) {
    return value as never;
  }

  if (BN.isBN(value)) {
    return value.toString() as never;
  }

  if (value instanceof Date) {
    return value.toISOString() as never;
  }

  if (value instanceof Set) {
    return Array.from(value) as never;
  }

  if (value instanceof Map) {
    return Object.fromEntries(value) as never;
  }

  if (Array.isArray(value)) {
    return value.map(toSerializable) as Serializable<T>;
  }

  const res: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value)) {
    res[k] = toSerializable(v);
  }

  return res as never;
};
