import { BASE_MATRIX_URL } from '@renderer/services/matrix/common/constants';
import Matrix, { Membership, Signatory } from '../../../src/renderer/services/matrix';
import { createRoom } from '../utils/matrixCreateRoom';
import signatories from './data.json';

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
  });

  afterEach(async () => {
    await matrix.logout();
  });

  test.each([['omni_test_account', '1q2w3eQWE!@']])('User %s can login', async (login, password) => {
    await matrix.loginWithCreds(login, password);

    expect(matrix.isLoggedIn).toBe(true);
  });

  test.each([['omni_test_account', '1q2w3eQWE!@', signatories]])(
    'User %s can create the room',
    async (login, password, signatories) => {
      await matrix.loginWithCreds(login, password);

      const signatoriesArray: Signatory[] = signatories;

      const room = await createRoom(
        matrix,
        '5Cf68pb7B4kDS59PXwXKXf196HECmRh6St6aZ22U8PS13iMN',
        login,
        2,
        signatoriesArray,
      );

      const room_list_after_creating = matrix.listOfOmniRooms(Membership.JOIN);

      expect(room_list_after_creating).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            roomId: room.roomId,
          }),
        ]),
      );
    },
  );
});
