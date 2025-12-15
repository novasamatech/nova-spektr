import { type Chain } from '@/shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type ValidationSchemaOptions = {
  chain: Chain;
};
