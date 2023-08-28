import type { Metadata } from '@renderer/entities/metadata';
import { ID, IMetadataStorage, MetadataDS, TMetadata } from './common/types';
import { ChainId } from '@renderer/domain/shared-kernel';

export const useMetadataStorage = (db: TMetadata): IMetadataStorage => ({
  getMetadata: (chainId: ChainId, metadataVersion: number): Promise<MetadataDS | undefined> => {
    return db.get([chainId, metadataVersion]);
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

  deleteMetadata: (chainId: ChainId, metadataVersion: number): Promise<void> => {
    return db.delete([chainId, metadataVersion.toString()]);
  },
});
