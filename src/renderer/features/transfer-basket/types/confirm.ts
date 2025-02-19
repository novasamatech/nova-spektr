import { type Address, type Asset, type Chain, type Transaction } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export type TransferInput = {
  id?: number;
  xcmChain: Chain;
  xcmAsset: Asset;
  chain: Chain;
  asset: Asset;
  account: AnyAccount;
  signatory: AnyAccount | null;
  amount: string;
  destination: Address;

  fee: string;
  xcmFee: string;
  deliveryFee: string | null;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};
