import { type ProviderInterface } from '@polkadot/rpc-provider/types';
import { hexToU8a, u8aToNumber } from '@polkadot/util';
import { isString } from 'lodash';

import { type ChainMetadata } from '@/shared/core';
import { type ProviderWithMetadata } from '../lib/types';

export function createCachedProvider(Provider: new (...args: any[]) => ProviderInterface, metadata?: ChainMetadata) {
  class CachedProvider extends Provider implements ProviderWithMetadata {
    private metadata: ChainMetadata | null = metadata || null;

    updateMetadata(metadata: ChainMetadata) {
      this.metadata = metadata;
    }

    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      const hasParams = params.length > 0;

      if (method === 'state_getMetadata' && !hasParams && this.metadata) {
        return Promise.resolve(this.metadata.metadata);
      }

      if (method === 'state_call' && hasParams && this.metadata) {
        const [call, rawVersion] = params;

        if (call === 'Metadata_metadata_at_version') {
          const metadataVersion = isString(rawVersion) ? u8aToNumber(hexToU8a(rawVersion)) : null;
          if (metadataVersion === this.metadata.metadataVersion) {
            return Promise.resolve(this.metadata.metadata);
          }
        }
      }

      return super.send(method, params, ...args);
    }
  }

  return CachedProvider;
}
