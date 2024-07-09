import type { Chain, Account } from '@shared/core';

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
  signatory?: Account;
  description: string;
  proxyDeposit: string;
};
