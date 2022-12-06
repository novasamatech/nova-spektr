import { toPublicKey } from '@renderer/utils/address';
import { Account } from './account';
import { ChainClass, CryptoType, WalletType } from './shared-kernel';

export type Wallet = {
  name: string;
  type: WalletType;
  isActive: boolean;
};

export function createWallet({ name, type }: Omit<Wallet, 'isActive'>): Wallet {
  return {
    name,
    type,
    isActive: false,
  } as Wallet;
}

export function createAccount({
  accountId,
  rootId,
  name,
  chainId,
  walletId,
  signingType,
  signingExtras,
}: Omit<Account, 'publicKey'>): Account {
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
  } as Account;
}
