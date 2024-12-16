import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';

import { type ChainMetadata, type NoID } from '@/shared/core';

export const metadataService = {
  requestMetadata,
  subscribeMetadata,
};

async function requestMetadata(api: ApiPromise): Promise<NoID<ChainMetadata>> {
  const [metadata, version] = await Promise.all([api.rpc.state.getMetadata(), api.rpc.state.getRuntimeVersion()]);

  return {
    metadata: metadata.toHex(),
    version: version.specVersion.toNumber(),
    chainId: api.genesisHash.toHex(),
  };
}

type SubscribeParams = {
  api: ApiPromise;
  cachedVersion: number | null;
  callback: (api: ApiPromise) => void;
};

function subscribeMetadata({ api, cachedVersion, callback }: SubscribeParams): UnsubscribePromise {
  let currectVersion = cachedVersion ?? 0;

  return api.rpc.state.subscribeRuntimeVersion((version) => {
    const receivedVersion = version.specVersion.toNumber();
    if (receivedVersion > currectVersion) {
      console.info(`Runtime version upgrade: ${currectVersion} -> ${receivedVersion}`);

      currectVersion = receivedVersion;
      callback(api);
    }
  });
}
