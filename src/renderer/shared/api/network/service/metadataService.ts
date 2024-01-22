import { ApiPromise } from '@polkadot/api';
import { UnsubscribePromise } from '@polkadot/api/types';

import type { Metadata, NoID } from '@shared/core';

export const metadataService = {
  requestMetadata,
  subscribeMetadata,
};

async function requestMetadata(api: ApiPromise): Promise<NoID<Metadata>> {
  const [metadata, version] = await Promise.all([api.rpc.state.getMetadata(), api.rpc.state.getRuntimeVersion()]);

  return {
    metadata: metadata.toHex(),
    version: version.specVersion.toNumber(),
    chainId: api.genesisHash.toHex(),
  };
}

function subscribeMetadata(api: ApiPromise, callback?: () => void): UnsubscribePromise {
  return api.rpc.state.subscribeRuntimeVersion(() => callback?.());
}
