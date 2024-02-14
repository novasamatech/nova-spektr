import { AutoLoginStatus } from './types';

export const matrixAutologinUtils = {
  isInProcess,
  isSuccess,
  isError,
};

function isInProcess(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.IN_PROCESS;
}

function isSuccess(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.SUCCESS;
}

function isError(status: AutoLoginStatus): boolean {
  return status === AutoLoginStatus.ERROR;
}
