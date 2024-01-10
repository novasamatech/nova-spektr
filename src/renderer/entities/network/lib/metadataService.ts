import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import { storage } from '@shared/api/storage';
import { IMetadataService, Metadata } from './common/types';
import type { ChainId } from '@shared/core';

export const useMetadata = (): IMetadataService => {
  const metadataStorage = storage.connectTo('metadata');

  if (!metadataStorage) {
    throw new Error('=== 🔴 Metadata storage in not defined 🔴 ===');
  }

  const { getAllMetadata, addMetadata, updateMetadata } = metadataStorage;

  const getMetadata = async (chainId: ChainId): Promise<Metadata | undefined> => {
    const metadata = await getAllMetadata({ chainId });

    if (!metadata.length) return;

    return metadata.reduce<Metadata>((acc, md) => {
      if (md.version >= (acc.version || -1)) return md;

      return acc;
    }, {} as Metadata);
  };

  const syncMetadata = async (api: ApiPromise): Promise<Metadata> => {
    const [metadata, version] = await Promise.all([api.rpc.state.getMetadata(), api.rpc.state.getRuntimeVersion()]);

    const newMetadata: Metadata = {
      metadata: metadata.toHex(),
      version: version.specVersion.toNumber(),
      chainId: api.genesisHash.toHex(),
    };

    return newMetadata;
  };

  const subscribeMetadata = (api: ApiPromise, callback?: () => void): UnsubscribePromise => {
    return api.rpc.state.subscribeRuntimeVersion(() => callback?.());
  };

  return {
    getMetadata,
    syncMetadata,
    subscribeMetadata,
    getAllMetadata,
    addMetadata,
    updateMetadata,
  };
};
