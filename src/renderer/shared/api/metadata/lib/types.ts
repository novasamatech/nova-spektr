import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import type { HexString, Metadata } from '@shared/core';
import { MetadataDS } from '../../storage';

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
