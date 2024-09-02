import { Text, i64, u128, u16, u32, u64 } from '@polkadot/types';
import { GenericAccountId } from '@polkadot/types/generic/AccountId';
import { type Perbill } from '@polkadot/types/interfaces';
import { z } from 'zod';

import { type AccountId } from '@/shared/core';

export const u16Schema = z.instanceof(u16).transform((value) => value.toNumber());
export const u32Schema = z.instanceof(u32).transform((value) => value.toNumber());
export const u64Schema = z.instanceof(u64).transform((value) => value.toBn());
export const u128Schema = z.instanceof(u128).transform((value) => value.toBn());
export const i64Schema = z.instanceof(i64).transform((value) => value.toBn());
export const textSchema = z.instanceof(Text).transform((value) => value.toString());

export const accountIdSchema = z.instanceof(GenericAccountId).transform((value, ctx) => {
  const account = value.toString();
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
