import { IndexableType } from 'dexie';

import { ChainId, CryptoType, PublicKey, ChainClass, SigningType } from './shared-kernel';

export type Account = {
  walletId: IndexableType;
  rootId?: IndexableType;
  name?: string;
  publicKey?: PublicKey;
  accountId: string;
  signingType: SigningType;
  cryptoType?: CryptoType;
  chainClass: ChainClass;
  chainId?: ChainId;
  // TODO: rename this to something as replacer for root account
  isMain?: boolean;
  signingExtras?: Record<string, any>;
};
