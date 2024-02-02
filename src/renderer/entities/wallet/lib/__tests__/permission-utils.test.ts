import { tests } from '../__mocks__/permission-utils.mock';

describe('shared/api/permission/permissionUtils.ts', () => {
  test.each(tests)('$testName', ({ wallet, accounts, result, method }) => {
    expect(method(wallet, accounts)).toEqual(result);
  });
});
