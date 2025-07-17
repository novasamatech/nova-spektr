import { type Chain, type Wallet } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type WalletData = {
  wallet: Wallet;
  initiator: AnyAccount;
  chain: Chain;
};

export type CallDataData = {
  initiator: AnyAccount;
};
