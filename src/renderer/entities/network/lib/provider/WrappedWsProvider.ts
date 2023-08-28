import { WsProvider } from '@polkadot/rpc-provider';

import { GET_METADATA_METHOD } from '../common/constants';
import { HexString } from '@renderer/domain/shared-kernel';

export const createWrappedWsProvider = (getMetadata: () => Promise<HexString | undefined>) => {
  class WrappedWsProvider extends WsProvider {
    async send(method: string, params: unknown[], isCacheable?: boolean, subscription?: any): Promise<any> {
      if (method === GET_METADATA_METHOD && params.length === 0) {
        const metadata = await getMetadata();
        if (metadata) return metadata;
      }

      return super.send(method, params, isCacheable, subscription);
    }
  }

  return WrappedWsProvider;
};
