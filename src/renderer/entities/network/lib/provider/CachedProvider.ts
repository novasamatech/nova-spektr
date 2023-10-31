import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { GET_METADATA_METHOD } from '../common/constants';
import { Metadata } from '../common/types';
import type { ChainId } from '@shared/core';

export const createCachedProvider = (
  Provider: new (...args: any[]) => ProviderInterface,
  chainId: ChainId,
  getMetadata: (chainId: ChainId) => Promise<Metadata | undefined>,
) => {
  class CachedProvider extends Provider {
    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      if (method === GET_METADATA_METHOD && params.length === 0) {
        const metadata = await getMetadata(chainId);

        if (metadata?.metadata) return metadata.metadata;
      }

      return super.send(method, params, ...args);
    }
  }

  return CachedProvider;
};
