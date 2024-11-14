import { isCorrectAccountId, isEthereumAccountId } from '@/shared/lib/utils';

import {
  type AccountId,
  type BlockHeight,
  accountIdSchema,
  blockHeightSchema,
  boolSchema,
  bytesHexSchema,
  bytesSchema,
  bytesString,
  dataStringSchema,
  hexSchema,
  i64Schema,
  nullSchema,
  perbillSchema,
  permillSchema,
  storageKeySchema,
  structHexSchema,
  textSchema,
  u128Schema,
  u16Schema,
  u32Schema,
  u64Schema,
  u8Schema,
} from './primitives';
import {
  complexSchema,
  enumTypeSchema,
  enumValueLooseSchema,
  enumValueSchema,
  objectSchema,
  optionalSchema,
  tupleMapSchema,
  vecSchema,
} from './structs';

export type { AccountId, BlockHeight };

export const pjsSchema = {
  perbill: perbillSchema,
  permill: permillSchema,
  u8: u8Schema,
  u16: u16Schema,
  u32: u32Schema,
  i64: i64Schema,
  u64: u64Schema,
  u128: u128Schema,
  text: textSchema,
  null: nullSchema,
  bytes: bytesSchema,
  bytesString: bytesString,
  bytesHex: bytesHexSchema,
  accountId: accountIdSchema,
  storageKey: storageKeySchema,
  bool: boolSchema,
  blockHeight: blockHeightSchema,
  structHex: structHexSchema,
  dataString: dataStringSchema,
  hex: hexSchema,
  u8Array: hexSchema,

  object: objectSchema,
  optional: optionalSchema,
  enumType: enumTypeSchema,
  enumValue: enumValueSchema,
  enumValueLoose: enumValueLooseSchema,
  tupleMap: tupleMapSchema,
  complex: complexSchema,
  vec: vecSchema,

  helpers: {
    toAccountId: (value: string) => {
      if (isCorrectAccountId(value as AccountId) || isEthereumAccountId(value as AccountId)) {
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
