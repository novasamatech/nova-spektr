import { ConnectionStatus } from '@shared/core';

export const networkUtils = {
  isConnected,
  isDisconnected,
  isError,
};

function isConnected(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.CONNECTED;
}
function isDisconnected(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.DISCONNECTED;
}
function isError(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.ERROR;
}
