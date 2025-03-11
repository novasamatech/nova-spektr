import { type HexString, type ProxyType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type DecodedTransaction } from '@/domains/network';

export type ProxyTransaction = DecodedTransaction<{
  real: AccountId;
  forceProxyType: ProxyType;
  call: HexString;
}>;
