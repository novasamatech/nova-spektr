import type { RpcNode } from './chain';
import type { ChainId, ID } from './general';

export type Connection = {
  id: ID;
  chainId: ChainId;
  canUseLightClient?: boolean;
  connectionType: ConnectionType;
  customNodes?: RpcNode[];
  activeNode?: RpcNode;
};

export const enum ConnectionType {
  LIGHT_CLIENT = 'LIGHT_CLIENT',
  AUTO_BALANCE = 'AUTO_BALANCE',
  RPC_NODE = 'RPC_NODE',
  DISABLED = 'DISABLED',
}

export const enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
