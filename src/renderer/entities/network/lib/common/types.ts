import { ApiPromise } from '@polkadot/api';
import { ProviderInterface, ProviderInterfaceCallback } from '@polkadot/rpc-provider/types';
import { UnsubscribePromise } from '@polkadot/api/types';

import type { Connection, Chain, ChainId, HexString, ConnectionStatus } from '@shared/core';
import { MetadataDS } from '@shared/api/storage';

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
  connectionStatus: ConnectionStatus;
  api?: ApiPromise;
  provider?: ProviderInterface;
  disconnect?: (switchNetwork: boolean) => Promise<void>;
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
  subscribeMetadata: (api: ApiPromise, callback?: () => void) => UnsubscribePromise;
  getAllMetadata: <T extends Metadata>(where?: Partial<T>) => Promise<MetadataDS[]>;
  addMetadata: (metadata: Metadata) => Promise<string[]>;
  updateMetadata: (metadata: Metadata) => Promise<string[]>;
}

export const enum ProviderType {
  WEB_SOCKET = 'ws',
  LIGHT_CLIENT = 'sc',
}

export type Subscription = {
  type: string;
  method: string;
  params: unknown[];
  cb: ProviderInterfaceCallback;
};

export type ChainMap = Record<ChainId, Chain>;
