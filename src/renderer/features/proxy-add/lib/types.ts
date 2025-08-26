import { type Chain, type ProxyType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type AddProxyStore = {
  chain: Chain | null;
  initiator: AnyAccount | null;
  signatory: AnyAccount | null;
  delegate: AccountId;
  proxyType: ProxyType;
  proxyDeposit: string;
  fee: string;
  multisigDeposit: string;
};
