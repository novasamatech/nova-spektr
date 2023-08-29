// import { ScProvider, WsProvider } from '@polkadot/rpc-provider';
import { ProviderInterface } from '@polkadot/rpc-provider/types';

import { GET_METADATA_METHOD } from '../common/constants';
import { useMetadata } from '@renderer/entities/metadata';
import { ChainId } from '@renderer/domain/shared-kernel';

const { getMetadata } = useMetadata();

export const createCachedProvider = (Provider: new (...args: any[]) => ProviderInterface, chainId: ChainId) => {
  class CachedProvider extends Provider {
    async send(method: string, params: unknown[], ...args: any[]): Promise<any> {
      if (method === GET_METADATA_METHOD && params.length === 0) {
        const metadata = await getMetadata(chainId);

        if (metadata) return metadata.metadata;
      }

      return super.send(method, params, ...args);
    }
  }

  return CachedProvider;
};
