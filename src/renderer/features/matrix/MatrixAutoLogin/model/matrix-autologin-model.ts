import { createEffect, createEvent, createStore, sample } from 'effector';
import { delay, not, spread } from 'patronum';

import { type ISecureMessenger } from '@shared/api/matrix';

import { LoginStatus, matrixModel, matrixUtils } from '@entities/matrix';

import { AUTO_LOGIN_DELAY } from '../lib/constants';
import { AutoLoginStatus } from '../lib/types';

const loggedInFromCache = createEvent();
const loggedInWithToken = createEvent<string>();
const proceedWithToken = createEvent<string>();

const $ssoToken = createStore<string | null>(null);
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
  clock: loggedInFromCache,
  source: {
    matrix: matrixModel.$matrix,
    loginStatus: matrixModel.$loginStatus,
  },
  filter: ({ loginStatus }) => matrixUtils.isLoggedOut(loginStatus),
  fn: ({ matrix }) => ({
    loginEffect: matrix,
    loginStatus: LoginStatus.AUTO_LOGIN,
  }),
  target: spread({
    loginEffect: loginFromCacheFx,
    loginStatus: matrixModel.$loginStatus,
  }),
});

sample({
  clock: loggedInWithToken,
  filter: loginFromCacheFx.pending,
  target: $ssoToken,
});

sample({
  clock: loggedInWithToken,
  filter: not(loginFromCacheFx.pending),
  target: proceedWithToken,
});

sample({
  clock: proceedWithToken,
  source: {
    matrix: matrixModel.$matrix,
    loginStatus: matrixModel.$loginStatus,
  },
  filter: ({ loginStatus }) => matrixUtils.isLoggedOut(loginStatus),
  fn: ({ matrix }, token) => ({
    loginEffect: { matrix, token },
    loginStatus: LoginStatus.AUTO_LOGIN,
    autoLoginStatus: AutoLoginStatus.IN_PROCESS,
  }),
  target: spread({
    loginEffect: loginWithTokenFx,
    loginStatus: matrixModel.$loginStatus,
    autoLoginStatus: $autoLoginStatus,
  }),
});

sample({
  clock: loginWithTokenFx.doneData,
  fn: () => AutoLoginStatus.SUCCESS,
  target: $autoLoginStatus,
});

sample({
  clock: [loginFromCacheFx.doneData, delay(loginWithTokenFx.doneData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_IN,
  target: matrixModel.$loginStatus,
});

sample({
  clock: loginWithTokenFx.failData,
  fn: () => AutoLoginStatus.ERROR,
  target: $autoLoginStatus,
});

sample({
  clock: [loginFromCacheFx.failData, delay(loginWithTokenFx.failData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_OUT,
  target: matrixModel.$loginStatus,
});

sample({
  clock: loginFromCacheFx.failData,
  source: $ssoToken,
  filter: Boolean,
  target: proceedWithToken,
});

export const matrixAutologinModel = {
  $autoLoginStatus,
  events: {
    loggedInFromCache,
    loggedInWithToken,
  },
};
