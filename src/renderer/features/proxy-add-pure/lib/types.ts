import { type Chain } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

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
  account: AnyAccount;
  signatory: AnyAccount | null;
  proxyDeposit: string;
};
