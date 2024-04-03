import type { ConnectionType, RpcNode } from '@shared/core';

export type SelectorPayload = {
  type: ConnectionType;
  title?: string;
  node?: RpcNode;
};

export type ConnectionOptions = {
  availableNodes: SelectorPayload[];
  selectedNode?: SelectorPayload;
  isCustomNode: (url: string) => boolean;
};
