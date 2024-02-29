import type { Metadata } from '@entities/network';
import { ID, IMetadataStorage, MetadataDS, TMetadata } from '../common/types';
import { ChainId } from '@shared/core';

export const useMetadataStorage = (db: TMetadata): IMetadataStorage => ({
  getMetadata: (chainId: ChainId, version: number): Promise<MetadataDS | undefined> => {
    return db.get([chainId, version]);
  },

  getAllMetadata: <T extends Metadata>(where?: Partial<T>): Promise<MetadataDS[]> => {
    return where ? db.where(where).toArray() : db.toArray();
  },

  addMetadata: (metadata: Metadata): Promise<ID[]> => {
    return db.add(metadata);
  },

  updateMetadata: (metadata: Metadata): Promise<ID[]> => {
    return db.put(metadata);
  },

  deleteMetadata: (chainId: ChainId, version: number): Promise<void> => {
    return db.delete([chainId, version.toString()]);
  },
});
