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

  test('should login with token on loggedInWithToken', async () => {
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loggedInWithToken, { scope, params: 'token' });

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

    const action = allSettled(matrixAutologinModel.events.loggedInWithToken, { scope, params: 'token' });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginWithSso).toHaveBeenCalledWith('token');
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_OUT);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.ERROR);
  });

  test('should login from cache on loggedInFromCache', async () => {
    const spyLoginFromCache = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loggedInFromCache, { scope });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginFromCache).toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.NONE);
  });

  test('should be logged out if login from cache fail', async () => {
    const spyLoginFromCache = jest.fn().mockRejectedValue(new Error('bad creds'));
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const action = allSettled(matrixAutologinModel.events.loggedInFromCache, { scope });

    await jest.runAllTimersAsync();
    await action;

    expect(spyLoginFromCache).toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_OUT);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.NONE);
  });

  test('should not login on loginStarted if already logged in', async () => {
    const spyLoginFromCache = jest.fn().mockResolvedValue('');
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache, loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_IN),
    });

    const actions = Promise.all([
      allSettled(matrixAutologinModel.events.loggedInFromCache, { scope }),
      allSettled(matrixAutologinModel.events.loggedInWithToken, { scope, params: 'token' }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(spyLoginFromCache).not.toHaveBeenCalled();
    expect(spyLoginWithSso).not.toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.NONE);
  });

  test('should not login with token after login from cache', async () => {
    const spyLoginFromCache = jest.fn().mockResolvedValue('');
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache, loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const actions = Promise.all([
      allSettled(matrixAutologinModel.events.loggedInFromCache, { scope }),
      allSettled(matrixAutologinModel.events.loggedInWithToken, { scope, params: 'token' }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(spyLoginFromCache).toHaveBeenCalled();
    expect(spyLoginWithSso).not.toHaveBeenCalled();
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.NONE);
  });

  test('should login with token after login from cache failed', async () => {
    const spyLoginFromCache = jest.fn().mockRejectedValue(new Error('bad creds'));
    const spyLoginWithSso = jest.fn().mockResolvedValue('');
    const scope = fork({
      values: new Map()
        .set(matrixModel.$matrix, { loginFromCache: spyLoginFromCache, loginWithSso: spyLoginWithSso })
        .set(matrixModel.$loginStatus, LoginStatus.LOGGED_OUT),
    });

    const actions = Promise.all([
      allSettled(matrixAutologinModel.events.loggedInFromCache, { scope }),
      allSettled(matrixAutologinModel.events.loggedInWithToken, { scope, params: 'token' }),
    ]);

    await jest.runAllTimersAsync();
    await actions;

    expect(spyLoginFromCache).toHaveBeenCalled();
    expect(spyLoginWithSso).toHaveBeenCalledWith('token');
    expect(scope.getState(matrixModel.$loginStatus)).toEqual(LoginStatus.LOGGED_IN);
    expect(scope.getState(matrixAutologinModel.$autoLoginStatus)).toEqual(AutoLoginStatus.SUCCESS);
  });
});
