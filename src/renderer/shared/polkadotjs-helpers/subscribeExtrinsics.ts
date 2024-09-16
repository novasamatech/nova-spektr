import { type ApiPromise } from '@polkadot/api';
import { type GenericExtrinsic } from '@polkadot/types';

type Params = {
  api: ApiPromise;
  name: string[];
};

export const subscribeExtrinsics = ({ api, name }: Params, fn: (extrinsic: GenericExtrinsic) => unknown) => {
  const methodsMap = Object.fromEntries(name.map((x) => [x, true]));

  return api.rpc.chain.subscribeAllHeads((header) => {
    api.rpc.chain.getBlock(header.hash).then((body) => {
      for (const extrinsic of body.block.extrinsics) {
        if (extrinsic.meta.name.toString() in methodsMap) {
          fn(extrinsic);
        }
      }
    });
  });
};
