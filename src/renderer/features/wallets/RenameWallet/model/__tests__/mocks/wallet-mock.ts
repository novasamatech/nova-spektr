import { SigningType, WalletType } from '@/shared/core';
import { createVaultBaseAccount } from '@/shared/mocks';

const wallet1 = {
  id: 1,
  accounts: [createVaultBaseAccount('1', { walletId: 1, name: 'New wallet name' })],
  name: 'My first wallet',
  type: WalletType.MULTISIG,
  signingType: SigningType.MULTISIG,
};

const wallet2 = {
  id: 2,
  accounts: [createVaultBaseAccount('2', { walletId: 2, name: 'New wallet name' })],
  name: 'My second wallet',
  type: WalletType.WATCH_ONLY,
  signingType: SigningType.WATCH_ONLY,
};

export const walletMock = {
  wallet1,
  wallet2,
};
