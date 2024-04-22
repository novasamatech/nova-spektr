import { tests } from '../__mocks__/permission-utils.mock';

describe('shared/api/permission/permission-utils', () => {
  test.each(tests)('$testName', ({ wallet, result, method }) => {
    expect(method(wallet)).toEqual(result);
  });
});
