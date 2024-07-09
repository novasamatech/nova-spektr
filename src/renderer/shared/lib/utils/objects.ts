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
