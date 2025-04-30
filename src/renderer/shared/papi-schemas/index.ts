import { isEthereumAccountId, isSubstrateAccountId } from '@/shared/lib/utils';

import {
  type AccountId,
  type BlockHeight,
  accountIdSchema,
  bigNumberSchema,
  blockHeightSchema,
  bytesHexSchema,
} from './primitives';

export type { AccountId, BlockHeight };

export const papiSchema = {
  accountId: accountIdSchema,
  blockHeight: blockHeightSchema,
  bigNumber: bigNumberSchema,
  bytesHex: bytesHexSchema,

  helpers: {
    toAccountId: (value: string) => {
      if (isSubstrateAccountId(value as AccountId) || isEthereumAccountId(value as AccountId)) {
        return value as AccountId;
      }

      throw new TypeError(`${value} is not account id`);
    },
    toBlockHeight: (value: number) => {
      if (value > 0) {
        return value as BlockHeight;
      }

      throw new TypeError(`${value} is not block height`);
    },
  },
};
