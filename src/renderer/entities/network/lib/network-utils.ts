import type { ChainOptions, Connection } from '@shared/core';
import { ConnectionType, ConnectionStatus } from '@shared/core';

export const networkUtils = {
  isConnectedStatus,
  isDisconnectedStatus,
  isErrorStatus,

  isMultisigSupported,
  isProxySupported,

  isLightClientConnection,
  isDisabledConnection,
  isEnabledConnection,
};

function isConnectedStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.CONNECTED;
}
function isDisconnectedStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.DISCONNECTED;
}
function isErrorStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.ERROR;
}

function isMultisigSupported(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes('multisig'));
}

function isProxySupported(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes('regular_proxy'));
}

function isLightClientConnection(connection: Connection): boolean {
  return connection.connectionType === ConnectionType.LIGHT_CLIENT;
}

function isDisabledConnection(connection: Connection): boolean {
  return connection.connectionType === ConnectionType.DISABLED;
}

function isEnabledConnection(connection: Connection): boolean {
  return connection.connectionType !== ConnectionType.DISABLED;
}
