import { UnsubscribePromise } from '@polkadot/api/types';
import { ApiPromise } from '@polkadot/api';

import { HexString } from '@renderer/domain/shared-kernel';
import { Metadata } from '../../model/types';

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
