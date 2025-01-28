import { type ApiPromise } from '@polkadot/api';

import { type BlockHeight, type ChainId } from '@/shared/core';
import { createDataSubscription } from '@/shared/effector';
import { systemPallet } from '@/shared/pallet/system';
import { polkadotjsHelpers } from '@/shared/polkadotjs-helpers';

const { $: $currentBlock } = createDataSubscription({
  initial: {} as Record<ChainId, BlockHeight>,
  async fn(params: { api: ApiPromise }, callback: (block: BlockHeight) => void) {
    systemPallet.storage.number(params.api).then(callback);

    return polkadotjsHelpers.subscribeBlocks({ api: params.api }, block => {
      systemPallet.storage.number(params.api).then(callback);
    });
  },
});
