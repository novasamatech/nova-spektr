import Matrix from '@renderer/services/matrix';
/**
 * Matrix integration tests
 *
 * @group integration
 * @group matrix/base
 */

describe('services/matrix', () => {
  let matrix: Matrix;

  beforeEach(() => {
    matrix = new Matrix();
    console.log(matrix);
  });

  test('We can login as testUser', () => {
    matrix.init();
    matrix.loginWithCreds('Login', 'Password');

    expect(matrix.isLoggedIn).toBe(true);
  });
});
