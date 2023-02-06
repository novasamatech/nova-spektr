import Paths from '@renderer/routes/paths';
import { createLink } from '@renderer/routes/utils';

describe('routes/utils/createLink', () => {
  test('parse route with params', () => {
    const result = createLink(Paths.BOND, { chainId: '0x123' });
    expect(result).toEqual('/staking/bond/0x123');
  });

  test('parse route with params and query', () => {
    const result = createLink(Paths.BOND, { chainId: '0x123' }, { data: [1, 2, 3, 4] });
    expect(result).toEqual('/staking/bond/0x123?data=1,2,3,4');
  });
});
