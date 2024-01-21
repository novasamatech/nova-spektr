import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import { storage } from '../../storage';
import { IMetadataService } from '../lib/types';
import type { ChainId, Metadata } from '@shared/core';

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

    return {
      metadata: metadata.toHex(),
      version: version.specVersion.toNumber(),
      chainId: api.genesisHash.toHex(),
    };
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
