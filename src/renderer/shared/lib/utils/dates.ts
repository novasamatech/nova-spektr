import { groupBy } from './arrays';

const toDateKey = (timestamp: number): string => {
  const d = new Date(timestamp);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export type DateGroup<T> = {
  dateKey: string;
  dateStart: Date;
  items: T[];
};

export function groupByDate<T>(items: T[], getTimestamp: (item: T) => number): DateGroup<T>[] {
  const buckets = groupBy(items, (item) => toDateKey(getTimestamp(item)));

  return Object.entries(buckets)
    .toSorted(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, list]) => {
      const sorted = (list ?? []).toSorted((a, b) => getTimestamp(b) - getTimestamp(a));
      const [y, m, d] = dateKey.split('-').map(Number);

      return { dateKey, dateStart: new Date(y ?? 0, (m ?? 1) - 1, d), items: sorted };
    });
}
