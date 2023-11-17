import { ApiPromise } from '@polkadot/api';
import { ProviderInterface } from '@polkadot/rpc-provider/types';
import { UnsubscribePromise } from '@polkadot/api/types';

import { ConnectionType } from '@shared/core';
import type { Connection, Chain, ChainId, RpcNode, HexString } from '@shared/core';

// =====================================================
// ======================= General =====================
// =====================================================

export type ChainLike = Pick<Chain, 'name' | 'options'>;

export const enum RpcValidation {
  'INVALID',
  'VALID',
  'WRONG_NETWORK',
}

export type ExtendedChain = Chain & {
  connection: Connection;
  api?: ApiPromise;
  provider?: ProviderInterface;
  disconnect?: (switchNetwork: boolean) => Promise<void>;
};

export type ConnectionsMap = Record<ChainId, ExtendedChain>;

export type ConnectProps = {
  chainId: ChainId;
  type: ConnectionType;
  node?: RpcNode;
  attempt?: number;
  timeoutId?: any;
};

export type Metadata = {
  chainId: ChainId;
  version: number;
  metadata?: HexString;
};

export interface IMetadataService {
  /**
   * If metadata exists return latest version from cache, else run syncMetadata and return new metadata
   */
  getMetadata: (chainId: HexString) => Promise<Metadata | undefined>;
  /**
   * Update metadata from chain
   */
  syncMetadata: (api: ApiPromise) => Promise<Metadata>;
  /**
   * Subscribe to subscribeRuntimeVersion and trigger syncMetadata if it will be changed
   */
  subscribeMetadata: (api: ApiPromise) => UnsubscribePromise;
}

export const enum ProviderType {
  WEB_SOCKET = 'ws',
  LIGHT_CLIENT = 'sc',
}
