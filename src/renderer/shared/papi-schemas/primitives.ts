import { BN } from '@polkadot/util';
import { Binary } from 'polkadot-api';
import { z } from 'zod';

import { type HexString } from '@/shared/core';
import { isCorrectAccountId, isEthereumAccountId, isHex } from '@/shared/lib/utils';

export const bytesHexSchema = z.instanceof(Binary).transform((value) => value.asHex() as HexString);
export const bigNumberSchema = z.bigint().transform((v) => new BN(v.toString()));

export type BlockHeight = z.infer<typeof blockHeightSchema>;
export const blockHeightSchema = z.number().describe('blockHeight').brand('blockHeight');

export type AccountId = z.infer<typeof accountIdSchema>;
export const accountIdSchema = z
  .string()
  .transform((value, ctx) => {
    if (isHex(value)) {
      if (isCorrectAccountId(value) || isEthereumAccountId(value)) {
        return value;
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Account id ${value} is invalid`,
      });

      return z.NEVER;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${ctx.path.join('.')} is not account id`,
    });

    return z.NEVER;
  })
  .describe('accountId')
  .brand('accountId');
