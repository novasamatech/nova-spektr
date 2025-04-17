import { SigningType, WalletType } from '@/shared/core';
import { createBaseAccount } from '@/shared/mocks';

const wallet1 = {
  id: 1,
  accounts: [createBaseAccount('1', { walletId: 1, name: 'New wallet name' })],
  name: 'My first wallet',
  isActive: false,
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

const wallet2 = {
  id: 2,
  accounts: [createBaseAccount('2', { walletId: 2, name: 'New wallet name' })],
  name: 'My second wallet',
  isActive: false,
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

export const walletMock = {
  wallet1,
  wallet2,
};
