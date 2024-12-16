import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';

import { type ChainMetadata, type NoID } from '@/shared/core';

export const metadataService = {
  requestMetadata,
  subscribeRuntimeVersion,
};

async function requestMetadata(api: ApiPromise): Promise<NoID<ChainMetadata>> {
  const [metadata, version] = await Promise.all([api.rpc.state.getMetadata(), api.rpc.state.getRuntimeVersion()]);

  return {
    metadata: metadata.asLatest.toHex(),
    metadataVersion: metadata.version,
    runtimeVersion: version.specVersion.toNumber(),
    chainId: api.genesisHash.toHex(),
  };
}

type SubscribeParams = {
  api: ApiPromise;
  cachedRuntimeVersion: number | null;
  callback: (api: ApiPromise) => void;
};

function subscribeRuntimeVersion({ api, cachedRuntimeVersion, callback }: SubscribeParams): UnsubscribePromise {
  let currectVersion = cachedRuntimeVersion ?? 0;

  return api.rpc.state.subscribeRuntimeVersion((version) => {
    const receivedVersion = version.specVersion.toNumber();
    if (receivedVersion > currectVersion) {
      console.info(`Runtime version upgrade: ${currectVersion} -> ${receivedVersion}`);

      currectVersion = receivedVersion;
      callback(api);
    }
  });
}
