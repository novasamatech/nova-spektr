import { ScProvider } from '@polkadot/rpc-provider';

import { GET_METADATA_METHOD } from '../common/constants';
import { HexString } from '@renderer/domain/shared-kernel';

export const createWrappedScProvider = (getMetadata: () => Promise<HexString | undefined>) => {
  class WrappedScProvider extends ScProvider {
    async send(method: string, params: unknown[]): Promise<any> {
      if (method === GET_METADATA_METHOD && params.length === 0) {
        const metadata = await getMetadata();
        if (metadata) return metadata;
      }

      return super.send(method, params);
    }
  }

  return WrappedScProvider;
};
