import { createEffect, sample, split, createEvent, createStore } from 'effector';
import { delay } from 'patronum';

import { ISecureMessenger } from '@shared/api/matrix';
import { matrixModel, LoginStatus, matrixUtils } from '@entities/matrix';
import { AUTO_LOGIN_DELAY } from '../lib/constants';
import { AutoLoginStatus } from '../lib/types';

const loginStarted = createEvent<string | undefined>();
const loginProceed = createEvent<string | undefined>();

const loggedInWithToken = createEvent<string>();
const loggedInFromCache = createEvent();

const $autoLoginStatus = createStore<AutoLoginStatus>(AutoLoginStatus.NONE);

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

sample({
  clock: loginStarted,
  source: {
    matrix: matrixModel.$matrix,
    loginStatus: matrixModel.$loginStatus,
  },
  filter: ({ loginStatus }) => matrixUtils.isLoggedOut(loginStatus),
  fn: (_, token) => token,
  target: loginProceed,
});

sample({
  clock: loginProceed,
  fn: () => AutoLoginStatus.IN_PROCESS,
  target: $autoLoginStatus,
});

split({
  source: loginProceed,
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
  target: matrixModel.$loginStatus,
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
  fn: () => AutoLoginStatus.SUCCESS,
  target: $autoLoginStatus,
});

sample({
  clock: [delay(loginWithTokenFx.doneData, AUTO_LOGIN_DELAY), delay(loginFromCacheFx.doneData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_IN,
  target: matrixModel.$loginStatus,
});

sample({
  clock: [loginWithTokenFx.failData, loginFromCacheFx.failData],
  fn: () => AutoLoginStatus.ERROR,
  target: $autoLoginStatus,
});

sample({
  clock: [delay(loginWithTokenFx.failData, AUTO_LOGIN_DELAY), delay(loginFromCacheFx.failData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_OUT,
  target: matrixModel.$loginStatus,
});

export const matrixAutologinModel = {
  $autoLoginStatus,
  events: {
    loginStarted,
  },
};
