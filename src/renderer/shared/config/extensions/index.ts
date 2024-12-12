import { type ChainId } from '@/shared/core';

import { AVAIL_PROVIDER, AVAIL_TXWRAPPER } from './avail';
import { MYTHOS_PROVIDER, MYTHOS_TXWRAPPER } from './mythos';
import { type Extension, type TxWrapper } from './types';

export const EXTENSIONS: {
  [chainId: ChainId]: { provider: Extension; txwrapper: TxWrapper } | undefined;
} = {
  '0xb91746b45e0346cc2f815a520b9c6cb4d5c0902af848db0a80f85932d2e8276a': {
    provider: AVAIL_PROVIDER,
    txwrapper: AVAIL_TXWRAPPER,
  },
  '0xf6ee56e9c5277df5b4ce6ae9983ee88f3cbed27d31beeb98f9f84f997a1ab0b9': {
    provider: MYTHOS_PROVIDER,
    txwrapper: MYTHOS_TXWRAPPER,
  },
};
