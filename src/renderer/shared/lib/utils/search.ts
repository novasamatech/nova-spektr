type CorrectKeys<T extends object> = {
  [K in keyof T]: T[K] extends string | number | undefined | null ? K : never;
}[keyof T];

type Params<T extends object> = {
  records: T[];
  weights: Partial<Record<CorrectKeys<T>, number>>;
  query: string;
  queryMinLength?: number;
};

/**
 * Method performs search and sorting of array by query
 * @param records - list of objects
 * @param query - requested string
 * @param weights - object with keys to search.
 */
export const performSearch = <T extends object>({ records, query, queryMinLength, weights }: Params<T>) => {
  if (query === '' || (queryMinLength && query.length < queryMinLength)) {
    return records;
  }

  const normalizedQuery = query.toLowerCase();
  const keys = Object.keys(weights) as CorrectKeys<T>[];

  const filteredList: T[] = [];
  const weightsMap: Map<T, number> = new Map();

  for (const item of records) {
    let found = false;
    let weight = 0;

    for (const key of keys) {
      const field = item[key];

      switch (typeof field) {
        case 'string':
        case 'number': {
          const result = field.toString().toLowerCase().includes(normalizedQuery);
          if (result) {
            found = true;
            weight += weights[key] ?? 0;
          }
          break;
        }
      }
    }

    if (found) {
      filteredList.push(item);
      weightsMap.set(item, weight);
    }
  }

  return filteredList.sort((a, b) => (weightsMap.get(b) ?? 0) - (weightsMap.get(a) ?? 0));
};
