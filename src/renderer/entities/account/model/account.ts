import { createKeyMulti } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';

import { AccountDS, ID } from '@renderer/shared/api/storage';
import { ChainId, CryptoType, AccountId, ChainType, Threshold } from '../../../domain/shared-kernel';
import { Signatory } from '@renderer/entities/signatory/model/signatory';
import { WalletType, SigningType } from '@renderer/entities/wallet/model/wallet';

export type Account = {
  walletId?: ID;
  rootId?: ID;
  name: string;
  accountId: AccountId;
  signingType: SigningType;
  cryptoType: CryptoType;
  chainType: ChainType;
  chainId?: ChainId;
  keyType?: KeyType;
  type?: AccountType; // TODO: make required during wallet / account refactoring
  shardedId?: ID;
  isActive: boolean;
  derivationPath?: string;
  signingExtras?: Record<string, any>;
};

export const enum KeyType {
  BASE = 'base',
  CHAIN = 'chain',
  SHARDED = 'sharded',
  SHARD = 'shard',
  MULTISIG = 'multisig',
}

export const enum AccountType {
  MAIN = 'main',
  PUBLIC = 'public',
  HOT = 'hot',
  GOVERNANCE = 'governance',
  STAKING = 'staking',
  CUSTOM = 'custom',
}

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
    isActive: false,
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

export function getMultisigAccountId(accountIds: AccountId[], threshold: Threshold): AccountId {
  return u8aToHex(createKeyMulti(accountIds, threshold));
}

export function createMultisigAccount({
  name,
  signatories,
  threshold,
  matrixRoomId,
  creatorAccountId,
  isActive,
}: Pick<
  MultisigAccount,
  'name' | 'signatories' | 'threshold' | 'matrixRoomId' | 'creatorAccountId' | 'isActive'
>): MultisigAccount {
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
    isActive,
  } as MultisigAccount;
}

export const isMultisig = (account?: Account | MultisigAccount): account is MultisigAccount => {
  if (!account) return false;

  const hasSignatories = 'signatories' in (account as MultisigAccount);
  const hasThreshold = 'threshold' in (account as MultisigAccount);

  return hasSignatories && hasThreshold;
};

export const isMultishard = (account?: Account | MultisigAccount): boolean => {
  if (!account) return false;

  return Boolean(account.walletId);
};

export function isWalletContact(account?: Account | MultisigAccount): boolean {
  if (!account) return false;

  return account.signingType !== SigningType.WATCH_ONLY && !isMultisig(account);
}

export function isVaultAccount(account?: Account | MultisigAccount): boolean {
  if (!account) return false;

  return account.signingType === SigningType.PARITY_SIGNER;
}

export const getActiveWalletType = (activeAccounts?: AccountDS[]): WalletType | null => {
  if (!activeAccounts?.length) return null;

  if (activeAccounts.length > 1) {
    return WalletType.MULTISHARD_PARITY_SIGNER;
  }

  const account = activeAccounts[0];
  if (isMultisig(account)) {
    return WalletType.MULTISIG;
  }

  if (account.signingType === SigningType.WATCH_ONLY) {
    return WalletType.WATCH_ONLY;
  }

  if (account.signingType === SigningType.PARITY_SIGNER) {
    return WalletType.SINGLE_PARITY_SIGNER;
  }

  return null;
};
