import { toPublicKey } from '@renderer/utils/address';
import { IndexableType } from 'dexie';

import { ChainId, CryptoType, PublicKey, ChainClass, SigningType } from './shared-kernel';

export type Account = {
  walletId?: IndexableType;
  rootId?: IndexableType;
  name: string;
  publicKey?: PublicKey;
  accountId?: string;
  signingType: SigningType;
  cryptoType?: CryptoType;
  chainClass: ChainClass;
  chainId?: ChainId;
  // TODO: rename this to something as replacer for root account
  isMain: boolean;
  signingExtras?: Record<string, any>;
  isActive: boolean;
};

export function createAccount({
  accountId,
  rootId,
  name,
  chainId,
  walletId,
  signingType,
  signingExtras,
}: Omit<Account, 'publicKey' | 'cryptoType' | 'chainClass' | 'isMain' | 'isActive'>): Account {
  return {
    publicKey: toPublicKey(accountId),
    accountId,
    cryptoType: CryptoType.SR25519,
    chainClass: ChainClass.SUBSTRATE,
    rootId,
    walletId,
    name,
    chainId,
    signingType,
    isMain: false,
    signingExtras,
    isActive: false,
  } as Account;
}
