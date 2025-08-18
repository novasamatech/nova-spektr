import { type BN } from '@polkadot/util';

import { type Address, type Asset, type Chain } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

export const enum Step {
  NONE,
  INIT,
  CONFIRM,
  SIGN,
  SUBMIT,
  BASKET,
}

export type NetworkStore = {
  chain: Chain;
  asset: Asset;
};

export type TransferStore = {
  initiator: AnyAccount;
  signatory: AnyAccount | null;
  amount: string;
  destination: Address;
  destinationChain: Chain;

  fee: BN;
  xcmFee: BN;
  multisigDeposit: BN;
};

export type BalanceMap = Record<'balance' | 'native', string>;
