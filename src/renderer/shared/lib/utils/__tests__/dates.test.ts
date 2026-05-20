import { describe, expect, it } from 'vitest';

import { groupByDate } from '../dates';

describe('groupByDate', () => {
  it('returns empty when input is empty', () => {
    expect(groupByDate([], () => 0)).toEqual([]);
  });

  it('groups items by local-day key and sorts groups descending', () => {
    const d1 = new Date(2026, 4, 18, 10).getTime();
    const d2 = new Date(2026, 4, 19, 10).getTime();
    const groups = groupByDate([{ t: d1 }, { t: d2 }], (x) => x.t);
    expect(groups.map((g) => g.dateKey)).toEqual(['2026-05-19', '2026-05-18']);
  });

  it('sorts items within a group descending by timestamp', () => {
    const morning = new Date(2026, 4, 18, 8).getTime();
    const evening = new Date(2026, 4, 18, 22).getTime();
    const groups = groupByDate([{ t: morning }, { t: evening }], (x) => x.t);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.items.map((x) => x.t)).toEqual([evening, morning]);
  });

  it('builds dateStart at the beginning of the local day', () => {
    const ts = new Date(2026, 4, 18, 14, 30).getTime();
    const [group] = groupByDate([{ t: ts }], (x) => x.t);
    expect(group!.dateStart.getHours()).toBe(0);
    expect(group!.dateStart.getDate()).toBe(18);
  });
});
