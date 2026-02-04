import { type Balance, type Chain } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
}

export type ValidationSchemaOptions = {
  chain: Chain;
  recipientBalances?: Map<AccountId, Balance>;
  recipientOccurrences?: Record<AccountId, number>;
};
