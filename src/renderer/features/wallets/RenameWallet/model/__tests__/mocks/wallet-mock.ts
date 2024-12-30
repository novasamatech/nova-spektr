import { AccountType, CryptoType, SigningType, type VaultBaseAccount, WalletType } from '@/shared/core';

const wallet1 = {
  id: 1,
  accounts: [
    { walletId: 1, cryptoType: CryptoType.SR25519, type: 'universal', accountType: AccountType.BASE },
  ] as VaultBaseAccount[],
  name: 'My first wallet',
  isActive: false,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

const wallet2 = {
  id: 2,
  accounts: [
    { walletId: 2, cryptoType: CryptoType.SR25519, type: 'universal', accountType: AccountType.BASE },
  ] as VaultBaseAccount[],
  name: 'My second wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

export const walletMock = {
  wallet1,
  wallet2,
};
