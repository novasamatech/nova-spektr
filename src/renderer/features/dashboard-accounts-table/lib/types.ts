import { type BN } from '@polkadot/util';

import { type Address, type Asset, type Chain, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { type PurposeSplit } from './balancePurpose';

export type WalletTypeBucket = 'vault' | 'multisig' | 'watchOnly' | 'walletConnect' | 'contact' | 'other';

export type NumericKey = 'transferable' | 'staked' | 'governance' | 'other' | 'total';
export type SortKey = 'chain' | NumericKey;
export type TableSortState = { key: SortKey; dir: 'asc' | 'desc' };

export type AccountRow = {
  id: string; // `${accountId}-${chainId}-${assetId}`
  accountId: AccountId;
  groupKey: string; // accountId hex — one group per key across chains
  displayName: string; // resolved name (search + CSV); cells render via NamedAccount
  displayAddress: Address; // SS58 in the chain's prefix
  shortAddress: string;
  wallet: Wallet | null;
  walletTypeBucket: WalletTypeBucket;
  chain: Chain;
  networkName: string; // relay name via chain.parentId, or the chain itself
  asset: Asset;
  split: PurposeSplit;
  totalBN: BN;
  /** Fiat per bucket; null = unpriced asset or bucket not applicable */
  fiat: Record<NumericKey, number | null>;
};

export type AccountGroup = {
  key: string;
  accountId: AccountId;
  name: string;
  wallet: Wallet | null;
  walletTypeBucket: WalletTypeBucket;
  rows: AccountRow[];
  subtotalFiat: number | null; // null when nothing in the group is priced
  chainCount: number;
  assetCount: number;
};
