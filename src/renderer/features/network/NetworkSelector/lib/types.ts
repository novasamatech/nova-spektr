import { type ConnectionType, type RpcNode } from '@shared/core';

export type SelectorPayload = {
  type: ConnectionType;
  title?: string;
  node?: RpcNode;
};

export type ConnectionItem = {
  type: ConnectionType;
  node?: RpcNode;
  isCustom?: boolean;
};
