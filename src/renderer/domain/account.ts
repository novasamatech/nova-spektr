import { IndexableType } from 'dexie';

import { toPublicKey } from '@renderer/utils/address';
import { ChainId, CryptoType, PublicKey, ChainType, SigningType, AccountID } from './shared-kernel';

export type Account = {
  walletId?: IndexableType;
  rootId?: IndexableType;
  name: string;
  publicKey?: PublicKey;
  accountId?: AccountID;
  signingType: SigningType;
  cryptoType?: CryptoType;
  chainType: ChainType;
  chainId?: ChainId;
  // TODO: rename this to something as replacer for root account
  isMain: boolean;
  signingExtras?: Record<string, any>;
  isActive: boolean;
  derivationPath?: string;
};

export function createAccount({
  accountId,
  rootId,
  name,
  chainId,
  walletId,
  signingType,
  signingExtras,
  derivationPath,
}: Omit<Account, 'publicKey' | 'cryptoType' | 'chainType' | 'isMain' | 'isActive'>): Account {
  return {
    publicKey: toPublicKey(accountId),
    accountId,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    rootId,
    walletId,
    name,
    chainId,
    signingType,
    isMain: false,
    signingExtras,
    isActive: true,
    derivationPath,
  } as Account;
}
