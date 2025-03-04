import { type BN } from '@polkadot/util';

import { type CallHash, type ChainId, type HexString, type ProxiedAccount } from '@/shared/core';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type MultisigEvent = {
  id: string;
  accountId: AccountId;
  status: 'approve' | 'reject';
  blockCreated: BlockHeight;
  indexCreated: number;
  timestamp: number;
  extrinsicHash?: HexString;
};

export type OperationData = {
  method?: string | null;
  section?: string | null;
  args?: Record<string, any> | null;
};

export type MultisigOperation = {
  id: string;
  status: 'pending' | 'cancelled' | 'executed' | 'error';
  chainId: ChainId;
  accountId: AccountId;
  callHash: CallHash;
  depositor: AccountId;
  deposit?: BN;
  blockCreated: BlockHeight;
  indexCreated: number;
  callData: HexString | null;
  events: MultisigEvent[];
  timestamp: number;
} & OperationData;

export type FlexibleMultisigOperation = MultisigOperation & {
  proxiedAccount: ProxiedAccount;
};
