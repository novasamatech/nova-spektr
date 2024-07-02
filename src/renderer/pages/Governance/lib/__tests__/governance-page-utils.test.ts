import { ChainId, ReferendumId } from '@shared/core';
import { filterReferendums } from '../utils';

describe('page/governance/lib/governance-page-utils', () => {
  const chainId = '0x1';
  const referendums = {
    111: {},
    222: {},
  };
  const details: Record<ChainId, Record<ReferendumId, string>> = {
    '0x1': {
      111: 'Referendum Title 1',
      222: 'Referendum Title 2',
    },
  };

  test('should return all referendums if query is empty', () => {
    const query = '';
    const result = filterReferendums({ referendums, query, titles: details, chainId });
    expect(result).toEqual(referendums);
  });

  test('should return referendums that match the query in the ID', () => {
    const query = '111';
    const result = filterReferendums({ referendums, query, titles: details, chainId });

    expect(Object.values(result).length).toEqual(1);
    expect('111' in result).toEqual(true);
  });

  test('should return referendums that match the query in the title', () => {
    const query = 'Title 2';
    const result = filterReferendums({ referendums, query, titles: details, chainId });
    expect(Object.values(result).length).toEqual(1);
    expect('222' in result).toEqual(true);
  });

  test('should return an empty map if no referendums match the query', () => {
    const query = 'none';
    const result = filterReferendums({ referendums, query, titles: details, chainId });
    expect(Object.values(result).length).toEqual(0);
  });
});
