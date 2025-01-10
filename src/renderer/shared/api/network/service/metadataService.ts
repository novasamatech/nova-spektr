import { type ApiPromise } from '@polkadot/api';
import { type UnsubscribePromise } from '@polkadot/api/types';

export const metadataService = {
  subscribeRuntimeVersion,
};

type SubscribeParams = {
  api: ApiPromise;
  cachedRuntimeVersion: number | null;
  callback: (api: ApiPromise) => void;
};

function subscribeRuntimeVersion({ api, cachedRuntimeVersion, callback }: SubscribeParams): UnsubscribePromise {
  let currectVersion = cachedRuntimeVersion ?? null;

  return api.rpc.state.subscribeRuntimeVersion((version) => {
    const receivedVersion = version.specVersion.toNumber();
    if (!currectVersion || receivedVersion > currectVersion) {
      console.info(`Runtime version upgrade: ${currectVersion ?? 'empty'} -> ${receivedVersion}`);

      currectVersion = receivedVersion;
      callback(api);
    }
  });
}
