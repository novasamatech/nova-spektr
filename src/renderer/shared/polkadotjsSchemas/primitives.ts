import { Bytes, StorageKey, Text, i64, u128, u16, u32, u64 } from '@polkadot/types';
import { GenericAccountId } from '@polkadot/types/generic/AccountId';
import { type Perbill } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { z } from 'zod';

import { type AccountId } from '@/shared/core';

export const storageKeySchema = <const T extends [z.ZodTypeAny, ...z.ZodTypeAny[]]>(...schema: T) => {
  const argsSchema = z.tuple(schema);

  return z.instanceof(StorageKey).transform((value) => {
    return argsSchema.parse(value.args);
  });
};

export const u16Schema = z.instanceof(u16).transform((value) => value.toNumber());
export const u32Schema = z.instanceof(u32).transform((value) => value.toNumber());
export const u64Schema = z.instanceof(u64).transform((value) => new BN(value.toString()));
export const u128Schema = z.instanceof(u128).transform((value) => new BN(value.toString()));
export const i64Schema = z.instanceof(i64).transform((value) => new BN(value.toString()));
export const textSchema = z.instanceof(Text).transform((value) => value.toString());
export const bytesSchema = z.instanceof(Bytes).transform((value) => value.toU8a());

export const boolSchema = z.unknown().transform((value) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'toPrimitive' in value &&
    typeof value.toPrimitive === 'function'
  ) {
    return value.toPrimitive() as boolean;
  }

  return z.NEVER;
});

export const accountIdSchema = z.instanceof(GenericAccountId).transform((value, ctx) => {
  const account = value.toHex();
  if (account.startsWith('0x')) {
    return account as AccountId;
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${ctx.path.join('.')} is not account id`,
  });

  return z.NEVER;
});

export const perbillSchema = z.unknown().transform((value, ctx) => {
  if (typeof value === 'object' && value !== null && 'toBn' in value) {
    return (value as Perbill).toBn();
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${ctx.path.join('.')} is not perbill`,
    fatal: true,
  });

  return z.NEVER;
});
