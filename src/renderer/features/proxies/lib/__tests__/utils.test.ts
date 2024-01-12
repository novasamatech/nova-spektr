import { Chain } from '@shared/core';
import { proxiesUtils } from '../utils';

describe('features/proxies/lib/utils', () => {
  test('should return true if "regular_proxy" is included in chain options', () => {
    const chainWithRegularProxy = { options: ['regular_proxy'] } as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithRegularProxy);

    expect(result).toEqual(true);
  });

  test('should return false if "regular_proxy" is not included in chain options', () => {
    const chainWithoutRegularProxy = { options: ['multisig'] } as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithoutRegularProxy);

    expect(result).toEqual(false);
  });

  test('should return false if chain options is undefined', () => {
    const chainWithUndefinedOptions = {} as Chain;
    const result = proxiesUtils.isRegularProxy(chainWithUndefinedOptions);

    expect(result).toEqual(false);
  });
});
