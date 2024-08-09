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
 * Performs searching by query and sort using weight of each
 * field
 *
 * @param records - List of objects
 * @param query - Requested string
 * @param queryMinLength - From this query length method
 *   starts to perform search
 * @param weights - Object with keys to search.
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
          const value = field.toString().toLowerCase();
          const result = value.indexOf(normalizedQuery);

          if (result === -1) {
            continue;
          }

          found = true;
          weight += (weights[key] ?? 0) + (value.length - result) * 0.1;
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
