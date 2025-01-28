import { type ApiPromise } from '@polkadot/api';
import { type GenericExtrinsic } from '@polkadot/types';

import { subscribeBlocks } from './subscribeBlocks';

type Params = {
  api: ApiPromise;
  name: string[];
};

export const subscribeExtrinsics = ({ api, name }: Params, fn: (extrinsic: GenericExtrinsic) => unknown) => {
  const methodsMap = new Set(name);

  return subscribeBlocks({ api }, (header) => {
    api.rpc.chain.getBlock(header.hash).then((body) => {
      for (const extrinsic of body.block.extrinsics) {
        if (methodsMap.has(extrinsic.meta.name.toString())) {
          fn(extrinsic);
        }
      }
    });
  });
};
