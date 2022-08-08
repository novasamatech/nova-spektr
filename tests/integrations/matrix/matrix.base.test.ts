import { BASE_MATRIX_URL } from '@renderer/services/matrix/common/constants';
import Matrix from '@renderer/services/matrix';

/**
 * Matrix integration tests
 *
 * @group integration
 * @group matrix/base
 */

describe('services/matrix', () => {
  let matrix: Matrix;

  beforeEach(async () => {
    matrix = new Matrix();
    await matrix.init();
    await matrix.setHomeserver(BASE_MATRIX_URL);
  }, 60_000);

  afterEach(async () => {
    await matrix.logout();
  });

  test.each([['omni_test_account', '1q2w3eQWE!@']])(
    'User %s login with password: %s',
    async (login, password) => {
      await matrix.loginWithCreds(login, password);

      expect(matrix.isLoggedIn).toBe(true);
    },
    60_000,
  );
});
