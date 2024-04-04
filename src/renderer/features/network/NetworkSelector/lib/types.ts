import type { ConnectionType, RpcNode } from '@shared/core';

export type SelectorPayload = {
  type: ConnectionType;
  title?: string;
  node?: RpcNode;
};

export type ConnectionList = {
  type: ConnectionType;
  node?: RpcNode;
  isCustom?: boolean;
};
