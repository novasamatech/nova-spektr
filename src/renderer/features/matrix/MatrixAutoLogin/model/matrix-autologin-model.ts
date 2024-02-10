import { createEffect, sample, split, createEvent } from 'effector';

import { ISecureMessenger } from '@shared/api/matrix';
import { matrixModel, LoginStatus } from '@entities/matrix';

const loginStarted = createEvent<string | undefined>();
const loggedInWithToken = createEvent<string>();
const loggedInFromCache = createEvent();

type LoginTokenParams = {
  matrix: ISecureMessenger;
  token: string;
};
const loginWithTokenFx = createEffect(({ matrix, token }: LoginTokenParams): Promise<void> => {
  return matrix.loginWithSso(token);
});

const loginFromCacheFx = createEffect((matrix: ISecureMessenger): Promise<void> => {
  return matrix.loginFromCache();
});

split({
  source: loginStarted,
  match: {
    withToken: (value) => Boolean(value),
  },
  cases: {
    withToken: loggedInWithToken,
    __: loggedInFromCache,
  },
});

sample({
  clock: [loggedInWithToken, loggedInFromCache],
  fn: () => LoginStatus.AUTO_LOGIN,
  target: matrixModel.events.loginStatusChanged,
});

sample({
  clock: loggedInWithToken,
  source: matrixModel.$matrix,
  fn: (matrix, token) => ({ matrix, token }),
  target: loginWithTokenFx,
});

sample({
  clock: loggedInFromCache,
  source: matrixModel.$matrix,
  target: loginFromCacheFx,
});

sample({
  clock: [loginWithTokenFx.doneData, loginFromCacheFx.doneData],
  fn: () => LoginStatus.LOGGED_IN,
  target: matrixModel.events.loginStatusChanged,
});

sample({
  clock: [loginWithTokenFx.failData, loginFromCacheFx.failData],
  fn: () => LoginStatus.LOGGED_OUT,
  target: matrixModel.events.loginStatusChanged,
});

export const matrixAutologinModel = {
  events: {
    loginStarted,
  },
};
