import { ChainOptions, Connection, ConnectionType, ConnectionStatus, ChainMetadata, ChainId } from '@shared/core';
import { RelayChains } from '@shared/lib/utils';

export const networkUtils = {
  isConnectedStatus,
  isConnectingStatus,
  isDisconnectedStatus,
  isErrorStatus,

  isMultisigSupported,
  isProxySupported,

  isLightClientConnection,
  isDisabledConnection,
  isEnabledConnection,
  isRpcConnection,
  isAutoBalanceConnection,

  getNewestMetadata,
  getLightClientChains,
};

function isConnectedStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.CONNECTED;
}
function isDisconnectedStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.DISCONNECTED;
}

function isConnectingStatus(status: ConnectionStatus): boolean {
  return status === ConnectionStatus.CONNECTING;
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

function isRpcConnection(connection: Connection): boolean {
  return connection.connectionType === ConnectionType.RPC_NODE;
}

function isAutoBalanceConnection(connection: Connection): boolean {
  return connection.connectionType === ConnectionType.AUTO_BALANCE;
}

function getNewestMetadata(metadata: ChainMetadata[]): Record<ChainId, ChainMetadata> {
  return metadata.reduce<Record<ChainId, ChainMetadata>>((acc, data) => {
    if (data.version >= (acc[data.chainId]?.version || -1)) {
      acc[data.chainId] = data;
    }

    return acc;
  }, {} as Record<ChainId, ChainMetadata>);
}

function getLightClientChains(): ChainId[] {
  return Object.values(RelayChains);
}
