import { performSearch } from '../search';

describe('shared/lib/utils/search', () => {
  it('should return same records on empty query', () => {
    const records = [{ data: 'test' }, { data: 'prefix test' }, { data: 'wrong' }];

    const result = performSearch({
      records,
      query: '',
      weights: { data: 1 },
    });

    expect(result).toBe(records);
  });

  it('should filter out records', () => {
    const records = [{ data: 'test' }, { data: 'prefix test' }, { data: 'wrong' }];

    const result = performSearch({
      records,
      query: 'test',
      weights: { data: 1 },
    });

    expect(result).toEqual([{ data: 'test' }, { data: 'prefix test' }]);
  });

  it('should sort records by weight', () => {
    const records = [
      { title: '', description: 'test' },
      { title: 'wrong', description: 'wrong' },
      { title: 'test', description: '' },
    ];

    const result = performSearch({
      records,
      query: 'test',
      weights: { title: 1, description: 0.5 },
    });

    expect(result).toEqual([
      { title: 'test', description: '' },
      { title: '', description: 'test' },
    ]);
  });

  it('should be case insensitive', () => {
    const records = [{ title: 'Test' }];

    const result = performSearch({
      records,
      query: 'test',
      weights: { title: 1 },
    });

    expect(result).toEqual(records);
  });

  it('should be case insensitive', () => {
    const records = [{ title: 'Test' }];

    const result = performSearch({
      records,
      query: 'tesT',
      weights: { title: 1 },
    });

    expect(result).toEqual(records);
  });

  it('should limit query length', () => {
    const records = [{ title: 'Test' }];

    const result = performSearch({
      records,
      query: 't',
      weights: { title: 1 },
      queryMinLength: 2,
    });

    expect(result).toEqual(records);
  });
});
