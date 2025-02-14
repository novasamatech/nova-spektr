import { type ApiPromise } from '@polkadot/api';
import { type Header } from '@polkadot/types/interfaces';

type Params = {
  api: ApiPromise;
};

export const subscribeBlocks = ({ api }: Params, fn: (header: Header) => unknown) => {
  return api.rpc.chain.subscribeNewHeads((header) => {
    fn(header);
  });
};
