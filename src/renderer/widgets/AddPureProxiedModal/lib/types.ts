import { type Account, type Chain } from '@/shared/core';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type AddPureProxiedStore = {
  chain: Chain;
  account: Account;
  signatory: Account | null;
  proxyDeposit: string;
};
