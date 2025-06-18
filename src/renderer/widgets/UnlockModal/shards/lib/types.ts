import { type BN } from '@polkadot/util';

import { type ClaimAction } from '@/shared/api/governance';
import { type Address, type Asset, type Chain, type ProxiedAccount, type Transaction } from '@/shared/core';
import { type AnyAccount } from '@/domains/network';

type ClaimData = {
  amount?: string;
  actions?: ClaimAction[];
  address?: Address;
};

export type AccountWithClaim = AnyAccount & ClaimData;

export type UnlockFormData = {
  id?: number;
  shards: AccountWithClaim[];
  amount: string;
  proxiedAccount?: ProxiedAccount & ClaimData;
  signatory: AnyAccount | null;
  chain: Chain;
  asset: Asset;
  totalLock: BN;

  fee: string;
  totalFee: string;
  multisigDeposit: string;
  coreTx?: Transaction | null;
};
