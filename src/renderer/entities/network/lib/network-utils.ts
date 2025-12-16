import {
  type Chain,
  type ChainId,
  type ChainMetadata,
  ChainOptions,
  type Connection,
  ConnectionStatus,
  ConnectionType,
  ExternalType,
} from '@/shared/core';
import { RelayChains } from '@/shared/lib/utils';

export const networkUtils = {
  isConnectedStatus,
  isConnectingStatus,
  isDisconnectedStatus,
  isErrorStatus,

  isMultisigSupported,
  isProxySupported,
  isPureProxySupported,
  isGovernanceSupported,
  isEthereumBased,

  isLightClientConnection,
  isDisabledConnection,
  isEnabledConnection,
  isRpcConnection,
  isAutoBalanceConnection,

  getNewestMetadata,
  getChainNodes,
  getChainNodesRotated,
  getLightClientChains,
  getProxyExternalApi,

  getMainRelaychains,
  chainNameToUrl,
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
  return Boolean(chainOptions?.includes(ChainOptions.MULTISIG));
}

function isProxySupported(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes(ChainOptions.REGULAR_PROXY));
}

function isPureProxySupported(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes(ChainOptions.PURE_PROXY));
}

function isGovernanceSupported(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes(ChainOptions.GOVERNANCE));
}

function isEthereumBased(chainOptions?: ChainOptions[]): boolean {
  return Boolean(chainOptions?.includes(ChainOptions.ETHEREUM_BASED));
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

function getProxyExternalApi(chain: Chain) {
  if (isMultisigSupported(chain.options)) {
    if (!chain.externalApi) return null;
    const proxyExternalApis = chain.externalApi[ExternalType.PROXY];
    if (!proxyExternalApis) return null;

    return proxyExternalApis.find((x) => x.url) ?? null;
  }

  return null;
}

function getNewestMetadata(metadata: ChainMetadata[]): Record<ChainId, ChainMetadata> {
  return metadata.reduce<Record<ChainId, ChainMetadata>>(
    (acc, data) => {
      if (data.runtimeVersion >= (acc[data.chainId]?.runtimeVersion || -1)) {
        acc[data.chainId] = data;
      }

      return acc;
    },
    {} as Record<ChainId, ChainMetadata>,
  );
}

function getLightClientChains(): ChainId[] {
  return Object.values(RelayChains);
}

function getMainRelaychains(chains: Chain[]): Chain[] {
  const MainRelaychains = [RelayChains.POLKADOT, RelayChains.KUSAMA, RelayChains.WESTEND];

  return chains.filter(({ chainId }) => MainRelaychains.includes(chainId));
}

function getChainNodes(chain: Chain, connection: Connection | null) {
  return !connection || networkUtils.isAutoBalanceConnection(connection)
    ? chain.nodes.concat(connection?.customNodes || []).map((node) => node.url)
    : [connection?.activeNode?.url || ''];
}

/**
 * Rotates nodes for auto balance connections by moving failed nodes to the end.
 * This helps ensure different nodes are tried when retrying after failures.
 *
 * @param chain - The chain configuration
 * @param connection - The connection configuration
 * @param failedAttempts - Number of failed attempts (used to rotate nodes)
 *
 * @returns Array of node URLs, rotated based on failed attempts
 */
function getChainNodesRotated(chain: Chain, connection: Connection | null, failedAttempts: number = 0) {
  const nodes = getChainNodes(chain, connection);

  // Only rotate for auto balance connections with multiple nodes
  if (connection && networkUtils.isAutoBalanceConnection(connection) && nodes.length > 1) {
    // Rotate by moving first N nodes to the end, where N is the number of failed attempts
    const rotationOffset = failedAttempts % nodes.length;
    if (rotationOffset > 0) {
      return [...nodes.slice(rotationOffset), ...nodes.slice(0, rotationOffset)];
    }
  }

  return nodes;
}

function chainNameToUrl(name: string): string {
  const filteredCharacters = /[^a-zA-Z0-9-]/g;
  const multipleDashes = /-{2,}/g;
  const lastDash = /-$/;

  return name
    .split(' ')
    .join('-')
    .toLowerCase()
    .replace(filteredCharacters, '')
    .replace(multipleDashes, '-')
    .replace(lastDash, '');
}
