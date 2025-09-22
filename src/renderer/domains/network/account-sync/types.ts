import { type ApiPromise } from '@polkadot/api';
import { type BN } from '@polkadot/util';

import { type Chain, type ChainId, type ProxyVariant } from '@/shared/core';
import { type KitchensinkRuntimeProxyType } from '@/shared/pallet/proxy';
import { type AccountId, type BlockHeight } from '@/shared/polkadotjs-schemas';

export type IndexedBlocksProvider = {
  fn(): Promise<Map<ChainId, number>>;
};

export interface SyncedAccount {
  accountId: AccountId;
}

export type AccountProviderChain = {
  chain: Chain;
  api: ApiPromise;
};

export type AccountProvider<Account extends SyncedAccount> = {
  getSupportedChains(chains: Chain[]): Chain[];
  fn(accounts: AccountId[], chains: Record<ChainId, AccountProviderChain>): Promise<Account[]>;
};

export interface SyncedProxyAccount extends SyncedAccount {
  type: 'proxy';
  chainId: ChainId;
  proxyAccountId: AccountId;
  delay: number;
  proxyType: KitchensinkRuntimeProxyType;
  proxyVariant: ProxyVariant;
  deposit: BN;
  blockNumber: BlockHeight;
  extrinsicIndex: number;
}

export interface SyncedMultisigAccount extends SyncedAccount {
  type: 'multisig';
  signatories: AccountId[];
  threshold: number;
}
