import { fork, allSettled } from 'effector';

import { matrixAutologinModel } from '../matrix-autologin-model';
import { matrixModel, LoginStatus } from '@entities/matrix';
import { AutoLoginStatus } from '../../lib/types';

describe('features/matrix/MatrixAutoLogin/model/matrix-autologin-model', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should login with token on loginStarted', async () => {
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loginStarted, { scope, params: 'token' });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginWithSso).toHaveBeenCalledWith('token');
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.SUCCESS);
  });

  test('should be logged out if login with token failed', async () => {
    const spyLoginWithSso = jest.fn().mockRejectedValue(new Error('bad token'));
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loginStarted, { scope, params: 'token' });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginWithSso).toHaveBeenCalledWith('token');
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_OUT);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.ERROR);
  });

  test('should login from cache on loginStarted', async () => {
    const spyLoginFromCache = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loginStarted, { scope, params: undefined });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginFromCache).toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.SUCCESS);
  });

  test('should be logged out if login from cache fail', async () => {
    const spyLoginFromCache = jest.fn().mockRejectedValue(new Error('bad creds'));
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loginStarted, { scope, params: undefined });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginFromCache).toHaveBeenCalledWith();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_OUT);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.ERROR);
  });

  test('should not login on loginStarted if already logged in', async () => {
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.IN_PROCESS),
    });

    const action = allSettled(matrixAutologinModel.events.loginStarted, { scope, params: 'token' });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginWithSso).not.toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.IN_PROCESS);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.NONE);
  });
});
