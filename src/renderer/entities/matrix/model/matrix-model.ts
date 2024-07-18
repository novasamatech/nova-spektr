import { createEvent, createStore, sample } from 'effector';

import { type ISecureMessenger, Matrix } from '@shared/api/matrix';
import { LoginStatus } from '../lib/types';

const loginStatusChanged = createEvent<LoginStatus>();

// TODO: store MatrixClient instead (requires complete rewrite of matrix service)
const $matrix = createStore<ISecureMessenger>(new Matrix());

const $loginStatus = createStore<LoginStatus>(LoginStatus.LOGGED_OUT);

sample({
  clock: loginStatusChanged,
  target: $loginStatus,
});

export const matrixModel = {
  $matrix,
  $loginStatus,
  events: {
    loginStatusChanged,
  },
};
