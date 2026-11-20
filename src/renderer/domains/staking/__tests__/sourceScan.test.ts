import {
  type ChainSourceMeta,
  type EraSourceMeta,
  type SourcePage,
  type SourceWalk,
  findMissingRanges,
  mergeChainScans,
  mergeEraScans,
  walkSourcePages,
} from '../source-scan';

const URL = 'https://indexer.test';

type Row = { id: string; value: string };

const row = (id: string, value = '1'): Row => ({ id, value });

const pageOf = (rows: Row[], totalCount: number, meta = 'first'): SourcePage<Row, string> => ({
  rows,
  totalCount,
  meta,
});

describe('domains/staking/source-scan · walkSourcePages', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('should hand over the rows once the announced count is reached', async () => {
    const walk = await walkSourcePages(URL, 5, offset => Promise.resolve(pageOf([row(`${offset}`)], 3)));

    expect(walk).toEqual({ status: 'complete', rows: [row('0'), row('1'), row('2')], meta: 'first' });
  });

  test('should keep what the source said about itself on the first page', async () => {
    const walk = await walkSourcePages(URL, 5, offset =>
      Promise.resolve(pageOf([row(`${offset}`)], 2, offset === 0 ? 'first' : 'later')),
    );

    expect(walk).toMatchObject({ status: 'complete', meta: 'first' });
  });

  test('should hand over no rows when a page rejects', async () => {
    const walk = await walkSourcePages(URL, 5, offset =>
      offset === 0 ? Promise.resolve(pageOf([row('0')], 2)) : Promise.reject(new Error('indexer down')),
    );

    expect(walk).toEqual({ status: 'failed', meta: 'first' });
  });

  test('should hand over no rows when a page cannot be made sense of', async () => {
    const walk = await walkSourcePages(URL, 5, offset => Promise.resolve(offset === 0 ? pageOf([row('0')], 2) : null));

    expect(walk).toEqual({ status: 'failed', meta: 'first' });
  });

  test('should know nothing about a source whose first page fails', async () => {
    const walk = await walkSourcePages<Row, string>(URL, 5, () => Promise.reject(new Error('indexer down')));

    expect(walk).toEqual({ status: 'failed', meta: null });
  });

  test('should hand over no rows when the page limit comes before the announced count', async () => {
    const walk = await walkSourcePages(URL, 2, offset => Promise.resolve(pageOf([row(`${offset}`)], 3)));

    expect(walk).toEqual({ status: 'cut-short', meta: 'first' });
  });

  test('should hand over no rows when the announced count moves under the walk', async () => {
    const walk = await walkSourcePages(URL, 5, offset => Promise.resolve(pageOf([row(`${offset}`)], 2 + offset)));

    expect(walk).toEqual({ status: 'cut-short', meta: 'first' });
  });

  test('should hand over no rows when the source runs dry before the announced count', async () => {
    const walk = await walkSourcePages(URL, 5, offset => Promise.resolve(pageOf(offset === 0 ? [row('0')] : [], 2)));

    expect(walk).toEqual({ status: 'failed', meta: 'first' });
  });
});

describe('domains/staking/source-scan · findMissingRanges', () => {
  const requested = { from: 100, to: 199 };

  test('should miss nothing when one range holds everything', () => {
    expect(findMissingRanges(requested, [{ from: 0, to: 500 }])).toEqual([]);
  });

  test('should miss nothing when adjacent ranges meet', () => {
    const held = [
      { from: 150, to: 300 },
      { from: 1, to: 149 },
    ];

    expect(findMissingRanges(requested, held)).toEqual([]);
  });

  test('should miss everything when nothing is held', () => {
    expect(findMissingRanges(requested, [])).toEqual([requested]);
  });

  test('should list the stretch before, between and after the held ranges', () => {
    const held = [
      { from: 160, to: 170 },
      { from: 110, to: 120 },
      { from: 115, to: 130 },
    ];

    expect(findMissingRanges(requested, held)).toEqual([
      { from: 100, to: 109 },
      { from: 131, to: 159 },
      { from: 171, to: 199 },
    ]);
  });

  test('should ignore ranges that lie outside of what was asked', () => {
    const held = [
      { from: 0, to: 50 },
      { from: 300, to: 400 },
    ];

    expect(findMissingRanges(requested, held)).toEqual([requested]);
  });
});

const isSame = (a: Row, b: Row) => a.value === b.value;

describe('domains/staking/source-scan · mergeEraScans', () => {
  const eraWalk = (rows: Row[], range: [number, number] | null): SourceWalk<Row, EraSourceMeta> => ({
    status: 'complete',
    rows,
    meta: { chain: '0xchain', range: range ? { from: range[0], to: range[1] } : null },
  });

  const merge = (sources: { url: string; walk: SourceWalk<Row, EraSourceMeta> }[]) =>
    mergeEraScans({ sources, requested: { from: 10, to: 20 }, getKey: record => record.id, isSame });

  test('should never merge a walk that did not complete', () => {
    const result = merge([
      { url: 'a', walk: eraWalk([row('1')], [0, 20]) },
      { url: 'b', walk: { status: 'cut-short', meta: { chain: '0xchain', range: { from: 0, to: 20 } } } },
    ]);

    expect(result.records).toEqual([row('1')]);
    expect(result.completeness).toEqual('partial');
    expect(result.scan.sources.map(source => source.merged)).toEqual([true, false]);
  });

  test('should not count the eras of an unmerged source as held', () => {
    const result = merge([
      { url: 'a', walk: eraWalk([row('1')], [0, 14]) },
      { url: 'b', walk: { status: 'failed', meta: { chain: '0xchain', range: { from: 15, to: 20 } } } },
    ]);

    expect(result.scan.missing).toEqual([{ from: 15, to: 20 }]);
  });

  test('should compare every copy of a record, not only neighbours', () => {
    const result = merge([
      { url: 'a', walk: eraWalk([row('1', 'x')], [0, 20]) },
      { url: 'b', walk: eraWalk([row('1', 'x')], [0, 20]) },
      { url: 'c', walk: eraWalk([row('1', 'y')], [0, 20]) },
    ]);

    expect(result.records).toEqual([]);
    expect(result.scan.conflicts).toEqual(['1']);
    expect(result.completeness).toEqual('partial');
  });
});

describe('domains/staking/source-scan · mergeChainScans', () => {
  const chainWalk = (rows: Row[], chain: string | null, upToDate = true): SourceWalk<Row, ChainSourceMeta> => ({
    status: 'complete',
    rows,
    meta: { chain, range: { from: 1, to: 100 }, upToDate },
  });

  const merge = (sources: { url: string; walk: SourceWalk<Row, ChainSourceMeta> }[]) =>
    mergeChainScans({ sources, getId: record => record.id, isSame });

  test('should keep records of different chains apart even under one id', () => {
    const result = merge([
      { url: 'a', walk: chainWalk([row('1', 'x')], '0xa') },
      { url: 'b', walk: chainWalk([row('1', 'y')], '0xb') },
    ]);

    expect(result.records).toEqual([row('1', 'x'), row('1', 'y')]);
    expect(result.completeness).toEqual('complete');
  });

  test('should keep a record two sources of one chain agree on once', () => {
    const result = merge([
      { url: 'a', walk: chainWalk([row('1')], '0xa') },
      { url: 'b', walk: chainWalk([row('1')], '0xa') },
    ]);

    expect(result.records).toEqual([row('1')]);
    expect(result.completeness).toEqual('complete');
  });

  test('should leave a complete source out when it does not name its chain and is not alone', () => {
    const result = merge([
      { url: 'a', walk: chainWalk([row('1')], '0xa') },
      { url: 'b', walk: chainWalk([row('2')], null) },
    ]);

    expect(result.records).toEqual([row('1')]);
    expect(result.completeness).toEqual('partial');
    expect(result.scan.sources.map(source => source.merged)).toEqual([true, false]);
  });

  test('should be partial when a merged source is not up to date', () => {
    const result = merge([
      { url: 'a', walk: chainWalk([row('1')], '0xa') },
      { url: 'b', walk: chainWalk([row('2')], '0xb', false) },
    ]);

    expect(result.records).toHaveLength(2);
    expect(result.completeness).toEqual('partial');
  });

  test('should be unavailable when nothing is merged', () => {
    const result = merge([{ url: 'a', walk: { status: 'failed', meta: null } }]);

    expect(result).toMatchObject({ records: [], completeness: 'unavailable' });
  });
});
