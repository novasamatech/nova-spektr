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

async function subscribeRuntimeVersion({ api, cachedRuntimeVersion, callback }: SubscribeParams): UnsubscribePromise {
  let currentVersion = cachedRuntimeVersion ?? null;

  await api.isReady;

  return api.rpc.state.subscribeRuntimeVersion((version) => {
    const receivedVersion = version.specVersion.toNumber();
    if (!currentVersion || receivedVersion > currentVersion) {
      console.info(`Runtime version upgrade: ${currentVersion ?? 'empty'} -> ${receivedVersion}`);

      currentVersion = receivedVersion;
      callback(api);
    }
  });
}
