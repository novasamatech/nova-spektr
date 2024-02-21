import { AutoLoginStatus } from './types';

export const matrixAutologinUtils = {
  isNone,
  isInProcess,
  isSuccess,
  isError,
};

function isNone(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.NONE;
}

function isInProcess(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.IN_PROCESS;
}

function isSuccess(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.SUCCESS;
}

function isError(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.ERROR;
}
