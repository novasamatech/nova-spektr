import { type Address, type ProxyType } from '@/shared/core';
import { type DecodedTransaction, type EncodedTransaction } from '@/domains/network';

export type ProxyTransaction = DecodedTransaction<{
  real: Address;
  forceProxyType: ProxyType;
  call: EncodedTransaction;
}>;
