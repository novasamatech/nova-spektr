import { ChainId } from './shared-kernel';

export type Connection = {
  chainId: ChainId;
  connectionType: ConnectionType;
  connectionStatus: ConnectionStatus;
  customNodes?: RpcNode[];
  activeNode?: RpcNode;
};

export type RpcNode = {
  url: string;
  name: string;
};

export const enum ConnectionType {
  LIGHT_CLIENT = 'LIGHT_CLIENT',
  RPC_NODE = 'RPC_NODE',
  DISABLED = 'DISABLED',
}

export const enum ConnectionStatus {
  NONE = 'NONE',
  CONNECTED = 'CONNECTED',
  CONNECTING = 'CONNECTING',
  ERROR = 'ERROR',
}
