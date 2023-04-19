import { createKeyMulti, encodeAddress } from '@polkadot/util-crypto';

import { toAccountId } from '@renderer/shared/utils/address';
import { ChainID, CryptoType, AccountID, ChainType, SigningType, Address, Threshold } from './shared-kernel';
import { Signatory } from '@renderer/domain/signatory';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';
import { ID } from '@renderer/services/storage';

export type Account = {
  walletId?: ID;
  rootId?: ID;
  name: string;
  accountId: AccountID;
  signingType: SigningType;
  cryptoType: CryptoType;
  chainType: ChainType;
  chainId?: ChainID;
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
  creatorAccountId: AccountID;
};

export function getMultisigAddress(addresses: AccountID[], threshold: Threshold): Address {
  return encodeAddress(createKeyMulti(addresses, threshold), SS58_DEFAULT_PREFIX);
}

export function createMultisigAccount({
  name,
  signatories,
  threshold,
  matrixRoomId,
  creatorAccountId,
}: Pick<MultisigAccount, 'name' | 'signatories' | 'threshold' | 'matrixRoomId' | 'creatorAccountId'>): MultisigAccount {
  const multisigAddress = getMultisigAddress(
    signatories.map((s) => s.accountId),
    threshold,
  );

  return {
    accountId: toAccountId(multisigAddress),
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
