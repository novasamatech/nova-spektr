import { createEffect, sample, split, createEvent, createStore } from 'effector';
import { delay } from 'patronum';

import { ISecureMessenger } from '@shared/api/matrix';
import { matrixModel, LoginStatus } from '@entities/matrix';
import { AUTO_LOGIN_DELAY } from '../lib/constants';
import { AutoLoginStatus } from '../lib/types';

const loginStarted = createEvent<string | undefined>();
const loggedInWithToken = createEvent<string>();
const loggedInFromCache = createEvent();

const $autoLoginStatus = createStore<AutoLoginStatus>(AutoLoginStatus.IN_PROCESS);

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
  fn: () => AutoLoginStatus.IN_PROCESS,
  target: $autoLoginStatus,
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
  fn: () => AutoLoginStatus.SUCCESS,
  target: $autoLoginStatus,
});

sample({
  clock: [delay(loginWithTokenFx.doneData, AUTO_LOGIN_DELAY), delay(loginFromCacheFx.doneData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_IN,
  target: matrixModel.events.loginStatusChanged,
});

sample({
  clock: [loginWithTokenFx.failData, loginFromCacheFx.failData],
  fn: () => AutoLoginStatus.ERROR,
  target: $autoLoginStatus,
});

sample({
  clock: [delay(loginWithTokenFx.failData, AUTO_LOGIN_DELAY), delay(loginFromCacheFx.failData, AUTO_LOGIN_DELAY)],
  fn: () => LoginStatus.LOGGED_OUT,
  target: matrixModel.events.loginStatusChanged,
});

export const matrixAutologinModel = {
  $autoLoginStatus,
  events: {
    loginStarted,
  },
};
