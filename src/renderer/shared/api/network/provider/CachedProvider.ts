import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { GET_METADATA_METHOD } from '../lib/constants';
import type { HexString } from '@shared/core';

export function createCachedProvider(Provider: new (...args: any[]) => ProviderInterface, metadata?: HexString) {
  class CachedProvider extends Provider {
    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      const hasMetadata = Boolean(metadata);
      const isMetadataMethod = method === GET_METADATA_METHOD;
      const hasParams = params.length > 0;

      return hasMetadata && isMetadataMethod && !hasParams ? metadata : super.send(method, params, ...args);
    }
  }

  return CachedProvider;
}
