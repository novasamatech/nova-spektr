import { SigningType, WalletType } from '@/shared/core';

const wallet1 = {
  id: 1,
  name: 'My first wallet',
  isActive: false,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

const wallet2 = {
  id: 2,
  name: 'My second wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

export const walletMock = {
  wallet1,
  wallet2,
};
