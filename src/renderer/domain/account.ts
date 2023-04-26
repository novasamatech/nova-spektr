import { createKeyMulti } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

import { ChainId, CryptoType, AccountId, ChainType, SigningType, Threshold } from './shared-kernel';
import { Signatory } from '@renderer/domain/signatory';
import { ID } from '@renderer/services/storage';

export type Account = {
  walletId?: ID;
  rootId?: ID;
  name: string;
  accountId: AccountId;
  signingType: SigningType;
  cryptoType: CryptoType;
  chainType: ChainType;
  chainId?: ChainId;
  // TODO: rename this to something as replacer for root account
  isMain: boolean;
  isActive: boolean;
  derivationPath?: string;
  signingExtras?: Record<string, any>;
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
}: Omit<Account, 'cryptoType' | 'chainType' | 'isMain' | 'isActive'>): Account {
  return {
    accountId,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    rootId,
    walletId,
    name,
    chainId,
    signingType,
    isMain: false,
    isActive: true,
    derivationPath,
    signingExtras,
  };
}

export type MultisigAccount = Account & {
  signatories: Signatory[];
  threshold: Threshold;
  matrixRoomId: string;
  creatorAccountId: AccountId;
};

export function getMultisigAccountId(addresses: AccountId[], threshold: Threshold): AccountId {
  return u8aToHex(createKeyMulti(addresses, threshold));
}

export function createMultisigAccount({
  name,
  signatories,
  threshold,
  matrixRoomId,
  creatorAccountId,
}: Pick<MultisigAccount, 'name' | 'signatories' | 'threshold' | 'matrixRoomId' | 'creatorAccountId'>): MultisigAccount {
  const multisigAccountId = getMultisigAccountId(
    signatories.map((s) => s.accountId),
    threshold,
  );

  return {
    accountId: multisigAccountId,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    name,
    signatories,
    threshold,
    matrixRoomId,
    signingType: SigningType.MULTISIG,
    creatorAccountId,
    isMain: false,
    isActive: true,
  } as MultisigAccount;
}

export function isMultisig(account?: Account | MultisigAccount): account is MultisigAccount {
  if (!account) return false;

  const hasSignatories = 'signatories' in (account as MultisigAccount);
  const hasThreshold = 'threshold' in (account as MultisigAccount);

  return hasSignatories && hasThreshold;
}
