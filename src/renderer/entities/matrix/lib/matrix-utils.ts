import { LoginStatus } from './types';

export const matrixUtils = {
  isLoggedOut,
  isAutoLogin,
  isInProcess,
  isLoggedIn,
};

function isLoggedOut(status: LoginStatus): boolean {
  return status === LoginStatus.LOGGED_OUT;
}

function isAutoLogin(status: LoginStatus): boolean {
  return status === LoginStatus.AUTO_LOGIN;
}

function isInProcess(status: LoginStatus): boolean {
  return status === LoginStatus.IN_PROCESS;
}

function isLoggedIn(status: LoginStatus): boolean {
  return status === LoginStatus.LOGGED_IN;
}
