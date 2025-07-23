import { type Address, type Chain, type ProxiedAccount, type ProxyType, type Transaction } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount } from '@/domains/network';

export type AddProxyInput = {
  chain: Chain;
  account: AnyAccount;
  signatory: AnyAccount | null;
  proxyType: ProxyType;
  delegate: Address;
  description: string;

  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;

  proxyDeposit: string;
  proxyNumber: number;
  fee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};

export type RemoveProxyInput = {
  chain: Chain;
  account: AnyAccount;
  signatory: AnyAccount | null;
  proxyType: ProxyType;
  delegate: Address;
  description: string;
  transaction: Transaction;
  proxiedAccount?: ProxiedAccount;

  fee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};

export type RemovePureProxiedInput = {
  signatory: AnyAccount | null;
  description: string;
  transaction: Transaction;
  spawner: AccountId;
  proxyType: ProxyType;
  chain?: Chain;
  account?: AnyAccount;
  proxiedAccount?: ProxiedAccount;

  fee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};
