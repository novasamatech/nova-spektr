import { type StorageEntryBaseAt } from '@polkadot/api/types';

import { substrateRpcPool } from '@/shared/api/substrate-helpers';
import { nullable } from '@/shared/lib/utils';

type Params = {
  query: StorageEntryBaseAt<'promise', VoidFunction>;
  pageSize: number;
};

export async function* createPagedRequest({ query, pageSize }: Params) {
  let lastPageSize = pageSize;
  let startKey: any = undefined;

  while (lastPageSize === pageSize) {
    yield substrateRpcPool
      .call(() =>
        query.entriesPaged({
          args: [],
          pageSize,
          startKey,
        }),
      )
      .then((res) => {
        const lastResult = res.at(-1);
        if (nullable(lastResult)) {
          lastPageSize = 0;

          return res;
        }

        lastPageSize = res.length;
        startKey = lastResult[0];

        return res;
      });
  }
}
