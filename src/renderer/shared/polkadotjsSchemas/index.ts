import {
  accountIdSchema,
  i64Schema,
  perbillSchema,
  textSchema,
  u128Schema,
  u16Schema,
  u32Schema,
  u64Schema,
} from './primitives';
import {
  complexSchema,
  enumTypeSchema,
  enumValueSchema,
  objectSchema,
  optionalSchema,
  tuppleMapSchema,
  vecSchema,
} from './structs';

export const pjsSchema = {
  perbill: perbillSchema,
  u16: u16Schema,
  u32: u32Schema,
  i64: i64Schema,
  u64: u64Schema,
  u128: u128Schema,
  text: textSchema,
  accountId: accountIdSchema,

  object: objectSchema,
  optional: optionalSchema,
  enumType: enumTypeSchema,
  enumValue: enumValueSchema,
  tuppleMap: tuppleMapSchema,
  complex: complexSchema,
  vec: vecSchema,
};
