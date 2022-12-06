import { IndexableType } from 'dexie';

import { ChainId, CryptoType, PublicKey, ChainClass, AccountType } from './shared-kernel';

export type Account = {
  walletId: IndexableType;
  rootId?: IndexableType;
  name?: string;
  publicKey: PublicKey;
  accountId: string;
  signingType: AccountType;
  cryptoType: CryptoType;
  chainClass: ChainClass;
  chainId?: ChainId;
  isMain?: boolean;
  extras?: Record<string, any>;
};
