import { MatrixClient } from 'matrix-js-sdk';

import { BASE_MATRIX_URL } from '@renderer/services/matrix/common/constants';
import Matrix, { Membership, Signatory } from '../../../src/renderer/services/matrix';
import { createRoom } from '../utils/matrixCreateRoom';
import { matrixLoginAndSync } from '../utils/matrixLogin';
import test_data from './matrix_data.json';

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

  test.each([test_data.test_accounts])('User %s can login', async (credentials) => {
    await matrixLoginAndSync(matrix, credentials.login, credentials.password);

    expect(matrix.isLoggedIn).toBe(true);
  });

  test.each([test_data.test_accounts])('User %s can create the room', async (credentials) => {
    await matrixLoginAndSync(matrix, credentials.login, credentials.password);

    const signatoriesArray: Signatory[] = test_data.signatories;

    const room = await createRoom(
      matrix,
      '5Cf68pb7B4kDS59PXwXKXf196HECmRh6St6aZ22U8PS13iMN',
      credentials.login,
      2,
      signatoriesArray,
    );

    await matrix.joinRoom(room.roomId);

    const room_list_after_creating = matrix.listOfOmniRooms(Membership.JOIN);

    expect(room_list_after_creating).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roomId: room.roomId,
        }),
      ]),
    );
  });
});
