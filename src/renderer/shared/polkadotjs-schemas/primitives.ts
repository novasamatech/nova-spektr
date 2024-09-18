import { Bytes, Null, StorageKey, Struct, Text, bool, i64, u128, u16, u32, u64, u8 } from '@polkadot/types';
import { GenericAccountId } from '@polkadot/types/generic/AccountId';
import { type Perbill, type Permill } from '@polkadot/types/interfaces';
import { BN } from '@polkadot/util';
import { z } from 'zod';

import { type HexString } from '@/shared/core';
import { isCorrectAccountId } from '@/shared/lib/utils';

type BrandedType<Value, Tag> = Value & { __tag: Tag };

export const storageKeySchema = <const T extends [z.ZodTypeAny, ...z.ZodTypeAny[]]>(...schema: T) => {
  const argsSchema = z.tuple(schema);

  return z.instanceof(StorageKey).transform((value) => {
    return argsSchema.parse(value.args);
  });
};

export const nullSchema = z.instanceof(Null).transform((value) => value.toPrimitive());

export const u8Schema = z
  .instanceof(u8)
  .transform((value) => value.toNumber())
  .describe('u8');
export const u16Schema = z
  .instanceof(u16)
  .transform((value) => value.toNumber())
  .describe('u16');
export const u32Schema = z
  .instanceof(u32)
  .transform((value) => value.toNumber())
  .describe('u32');
export const u64Schema = z
  .instanceof(u64)
  .transform((value) => new BN(value.toString()))
  .describe('u64');
export const u128Schema = z
  .instanceof(u128)
  .transform((value) => new BN(value.toString()))
  .describe('u128');
export const i64Schema = z
  .instanceof(i64)
  .transform((value) => new BN(value.toString()))
  .describe('i64');
export const textSchema = z
  .instanceof(Text)
  .transform((value) => value.toString())
  .describe('text');
export const bytesSchema = z.instanceof(Bytes).transform((value) => value.toU8a());
export const bytesHexSchema = z.instanceof(Bytes).transform((value) => value.toHex());

export const boolSchema = z.instanceof(bool).transform((value) => value.toPrimitive());

export const structHexSchema = z.instanceof(Struct).transform((value) => value.toHex());

export type BlockHeight = BrandedType<number, 'blockHeight'>;
export const blockHeightSchema = u32Schema.transform((value) => value as BlockHeight);

export type AccountId = BrandedType<HexString, 'accountId'>;
export const accountIdSchema = z
  .instanceof(GenericAccountId)
  .transform((value, ctx) => {
    const account = value.toHex();
    if (account.startsWith('0x')) {
      if (isCorrectAccountId(account as AccountId)) {
        return account;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Account id ${account} is invalid`,
      });

      return z.NEVER;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${ctx.path.join('.')} is not account id`,
    });

    return z.NEVER;
  })
  .describe('accountId');

/**
 * Parts per Billion.
 *
 * A fixed point representation of a number in the range [0, 1].
 */
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

/**
 * Parts per Million
 *
 * A fixed point representation of a number in the range [0, 1].
 */
export const permillSchema = z.unknown().transform((value, ctx) => {
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as Permill).toNumber();
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${ctx.path.join('.')} is not permill`,
    fatal: true,
  });

  return z.NEVER;
});
