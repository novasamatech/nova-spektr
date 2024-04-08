import { ConnectionType, RpcNode } from '@shared/core';

export const Predicates: Record<
  ConnectionType,
  (data: { type: ConnectionType; node?: RpcNode }, active?: RpcNode) => boolean
> = {
  [ConnectionType.LIGHT_CLIENT]: (data) => data.type === ConnectionType.LIGHT_CLIENT,
  [ConnectionType.AUTO_BALANCE]: (data) => data.type === ConnectionType.AUTO_BALANCE,
  [ConnectionType.DISABLED]: (data) => data.type === ConnectionType.DISABLED,
  [ConnectionType.RPC_NODE]: (data, active) => data.node?.url === active?.url,
};
