import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import { IMetadataService } from './common/types';
import { Metadata, metadataModel } from '..';
import { ChainId } from '@renderer/domain/shared-kernel';
import storage from '@renderer/shared/api/storage';

export const useMetadata = (): IMetadataService => {
  const metadataStorage = storage.connectTo('metadata');

  if (!metadataStorage) {
    throw new Error('=== 🔴 Metadata storage in not defined 🔴 ===');
  }

  const { getAllMetadata } = metadataStorage;

  const getMetadata = async (chainId: ChainId): Promise<Metadata | undefined> => {
    const metadata = await getAllMetadata({ chainId });

    if (metadata.length) {
      const lastMetadata = metadata.reduce<Metadata>((acc, metadata) => {
        if (metadata.metadataVersion > acc.metadataVersion) {
          return metadata;
        }

        return acc;
      }, {} as Metadata);

      return lastMetadata;
    }
  };

  const syncMetadata = async (api: ApiPromise): Promise<Metadata> => {
    const metadata = await api.rpc.state.getMetadata();
    const newMetadata: Metadata = {
      metadata: metadata.toHex(),
      metadataVersion: metadata.version,
      chainId: api.genesisHash.toHex(),
    };
    metadataModel.effects.addMetadataFx(newMetadata);

    return newMetadata;
  };

  const subscribeMetadata = (api: ApiPromise): UnsubscribePromise => {
    return api.rpc.state.subscribeRuntimeVersion(async (version) => {
      const chainId = api.genesisHash.toHex();
      const oldMetadata = await getMetadata(chainId);

      if (!oldMetadata || version.specVersion.toNumber() > oldMetadata.metadataVersion) {
        syncMetadata(api);
      }
    });
  };

  return {
    getMetadata,
    syncMetadata,
    subscribeMetadata,
  };
};
