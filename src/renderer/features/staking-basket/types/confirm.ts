import { type Asset, type Chain, type ProxiedAccount, type Transaction, type Validator } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type BondNominateInput = {
  id?: number;
  chain: Chain;
  asset: Asset;

  shards: AnyAccount[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  amount: string;
  destination: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};

export type BondExtraInput = {
  id?: number;
  chain: Chain;
  asset: Asset;

  shards: AnyAccount[];
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  amount: string;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};

export type NominateInput = {
  id?: number;
  chain: Chain;
  asset: Asset;

  shards: AnyAccount[];
  validators: Validator[];
  proxiedAccount?: ProxiedAccount;
  signatory: AnyAccount | null;
  description: string;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};

export type RestakeInput = {
  id?: number;
  chain: Chain;
  asset: Asset;

  shards: AnyAccount[];
  proxiedAccount?: ProxiedAccount;
  amount: string;
  description: string;
  signatory: AnyAccount | null;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};
