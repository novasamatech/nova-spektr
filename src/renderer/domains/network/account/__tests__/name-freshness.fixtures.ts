import { type BackendContact, type Wallet, AccountNameType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { createAccountId } from '@/shared/mocks';
import { type UniversalAccount } from '../types';

export const multisigAccountId = createAccountId('multisig');

export const createMultisigWallet = (id: number): Wallet => ({
  id,
  name: toShortAddress(toAddress(multisigAccountId), 5),
  type: WalletType.MULTISIG,
  accounts: [],
});

export const createMultisigAccount = (walletId: number): UniversalAccount => ({
  id: `multisig-${walletId}`,
  type: 'universal',
  accountId: multisigAccountId,
  walletId,
  name: toShortAddress(toAddress(multisigAccountId), 5),
  nameType: AccountNameType.GENERATED,
  signingType: SigningType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
});

export const multisigContact: BackendContact = {
  id: 'backend-multisig',
  accountId: multisigAccountId,
  name: 'FINOPS_DOT_MSIG',
  address: toAddress(multisigAccountId),
  source: 'backend',
  chainId: null,
  chainName: null,
  derivationPath: null,
  ownerAccountId: null,
  signatories: null,
  threshold: null,
  fields: [],
};
