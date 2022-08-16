import { ChainId } from './shared-kernel';

export type Connection = {
  chainId: ChainId;
  type: ConnectionType;
};

export const enum ConnectionType {
  LIGHT_CLIENT = 'LIGHT_CLIENT',
  RPC_NODE = 'RPC_NODE',
  DISABLED = 'DISABLED',
}
