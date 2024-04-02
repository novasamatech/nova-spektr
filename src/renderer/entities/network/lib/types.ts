import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import type { Connection, Chain, ConnectionStatus, ConnectionType, RpcNode } from '@shared/core';

// =====================================================
// ======================= General =====================
// =====================================================

export type ExtendedChain = Chain & {
  connection: Connection;
  connectionStatus: ConnectionStatus;
  api?: ApiPromise;
  provider?: ProviderInterface;
};

export type SelectorPayload = {
  type: ConnectionType;
  title?: string;
  node?: RpcNode;
};

export type ConnectionOptions = {
  availableNodes: SelectorPayload[];
  activeNode?: RpcNode;
  selectedNode?: SelectorPayload;
  isCustomNode: (url: string) => boolean;
};
