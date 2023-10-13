import type { Wallet } from './wallet';
import type { Signatory } from './signatory';
import { ChainType, CryptoType } from './general';
import type { AccountId, ChainId, Threshold, ID } from './general';

type AbstractAccount = {
  id: ID;
  walletId: Wallet['id'];
  name: string;
  type: AccountType;
};

export type BaseAccount = AbstractAccount & {
  accountId: AccountId;
  chainType: ChainType;
  cryptoType: CryptoType;
  signingExtras?: Record<string, any>;
};

// export type ShardedAccount = BaseAccount & {
//   keyType: KeyType;
//   chainId: ChainId;
// };

export type ChainAccount = BaseAccount & {
  baseId: BaseAccount['id'];
  chainId: ChainId;
  keyType: KeyType;
  derivationPath: string;
};

// export type ShardAccount = BaseAccount & {
//   shardedId: BaseAccount['id'];
//   chainId: ChainId;
//   derivationPath: string;
// };

export type MultisigAccount = BaseAccount & {
  signatories: Signatory[];
  threshold: Threshold;
  matrixRoomId: string;
  creatorAccountId: AccountId;
};

// export type WalletConnectAccount = Omit<BaseAccount, 'cryptoType'> & {
//   chainId: ChainId;
// };

export type Account = BaseAccount | ChainAccount | MultisigAccount;

export const enum AccountType {
  BASE = 'base',
  CHAIN = 'chain',
  // SHARDED = 'sharded',
  // SHARD = 'shard',
  MULTISIG = 'multisig',
  // WALLET_CONNECT = 'wallet_connect',
}

export const enum KeyType {
  MAIN = 'main',
  PUBLIC = 'public',
  HOT = 'hot',
  GOVERNANCE = 'governance',
  STAKING = 'staking',
  CUSTOM = 'custom',
}
