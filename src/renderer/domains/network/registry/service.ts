import { type ConnectionStatus } from './lib/types';

function isConnecting(status: ConnectionStatus): boolean {
  return status === 'connecting';
}

function isConnected(status: ConnectionStatus): boolean {
  return status === 'connected';
}

function isError(status: ConnectionStatus): boolean {
  return status === 'error';
}

function isClose(status: ConnectionStatus): boolean {
  return status === 'close';
}

export const registryService = {
  isConnecting,
  isConnected,
  isError,
  isClose,
};
