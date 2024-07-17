import { type ProviderInterface } from '@polkadot/rpc-provider/types';

import type { HexString } from '@shared/core';
import { GET_METADATA_METHOD } from '../lib/constants';
import { type ProviderWithMetadata } from '../lib/types';

export function createCachedProvider(Provider: new (...args: any[]) => ProviderInterface, metadata?: HexString) {
  class CachedProvider extends Provider implements ProviderWithMetadata {
    private metadata: HexString | undefined = metadata;

    updateMetadata(metadata: HexString) {
      this.metadata = metadata;
    }

    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      const hasMetadata = Boolean(this.metadata);
      const isMetadataMethod = method === GET_METADATA_METHOD;
      const hasParams = params.length > 0;

      return hasMetadata && isMetadataMethod && !hasParams ? this.metadata : super.send(method, params, ...args);
    }
  }

  return CachedProvider;
}
