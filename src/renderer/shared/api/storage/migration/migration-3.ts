import { Transaction } from 'dexie';

import { ChainId } from '@shared/core';

export async function removeMetadataDuplications(trans: Transaction): Promise<void> {
  const metadataStore: Record<ChainId, Record<string, boolean>> = {};

  await trans
    .table('metadata')
    .toCollection()
    .modify((metadata, ref) => {
      const chainMetadata = metadataStore[metadata.chainId];

      if (chainMetadata?.[metadata.version]) {
        delete ref.value;
      } else {
        metadataStore[metadata.chainId] = {
          ...(metadataStore[metadata.chainId] || {}),
          [metadata.version]: true,
        };
      }
    });
}
