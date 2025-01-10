type CorrectKeys<T extends object> = {
  [K in keyof T]: T[K] extends string | number | undefined | null ? K : never;
}[keyof T];

type Params<T extends object, M extends object> = {
  records: T[];
  getMeta?: (record: NoInfer<T>) => M;
  weights: Partial<Record<CorrectKeys<NoInfer<T & M>>, number>>;
  query: string;
  queryMinLength?: number;
};

const emptyMeta = <M extends object>(): M => {
  return {} as M;
};

/**
 * Performs searching by query and sort using weight of each field
 *
 * @param records - List of objects
 * @param getMeta - List of additional info, associated with given record by
 *   index
 * @param query - Requested string
 * @param queryMinLength - From this query length method starts to perform
 *   search
 * @param weights - Object with keys to search.
 */
export const performSearch = <T extends object, M extends object = Record<string, never>>({
  records,
  getMeta = emptyMeta<M>,
  query,
  queryMinLength,
  weights,
}: Params<T, M>) => {
  if (query === '' || (queryMinLength && query.length < queryMinLength)) {
    return records;
  }

  const normalizedQuery = query.toLowerCase();
  const keys = Object.keys(weights) as CorrectKeys<T & M>[];

  const filteredList: T[] = [];
  const weightsMap: Map<T, number> = new Map();

  for (const record of records) {
    let found = false;
    let weight = 0;

    const meta = getMeta(record);

    for (const key of keys) {
      // @ts-expect-error types are too dynamic :(
      const field: unknown = record[key] ?? meta[key];

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
      filteredList.push(record);
      weightsMap.set(record, weight);
    }
  }

  return filteredList.sort((a, b) => (weightsMap.get(b) ?? 0) - (weightsMap.get(a) ?? 0));
};
