import { type ApiPromise } from '@polkadot/api';

import { type ChainId } from '@/shared/core';

export const metadataService = {
  subscribeRuntimeVersion,
};

type SubscribeParams = {
  api: ApiPromise;
  callback: (params: { chainId: ChainId; receivedVersion: number }) => void;
};

async function subscribeRuntimeVersion({ api, callback }: SubscribeParams) {
  const chainId = api.genesisHash.toHex();

  return api.rpc.state.subscribeRuntimeVersion((version) => {
    const receivedVersion = version.specVersion.toNumber();
    callback({ chainId, receivedVersion });
  });
}
