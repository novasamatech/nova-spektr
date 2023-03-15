import { IndexableType } from 'dexie';
import { createKeyMulti, encodeAddress } from '@polkadot/util-crypto';

import { toPublicKey } from '@renderer/shared/utils/address';
import { ChainId, CryptoType, PublicKey, ChainType, SigningType, AccountID } from './shared-kernel';
import { Contact } from './contact';
import { SS58_DEFAULT_PREFIX } from '@renderer/shared/utils/constants';

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

export type MultisigAccount = Account & {
  signatories: Contact[];
  threshold: number;
  matrixRoomId: string;
  creator: AccountID;
};

export function getMultisigAddress(accoundIds: AccountID[], threshold: number): AccountID {
  const multisigKey = createKeyMulti(accoundIds, threshold);

  return encodeAddress(multisigKey, SS58_DEFAULT_PREFIX);
}

export function createMultisigAccount({
  name,
  signatories,
  threshold,
  matrixRoomId,
  creator,
}: Pick<MultisigAccount, 'name' | 'signatories' | 'threshold' | 'matrixRoomId' | 'creator'>): MultisigAccount {
  const multisigAddress = getMultisigAddress(
    signatories.map((s) => s.accountId),
    threshold,
  );

  return {
    publicKey: toPublicKey(multisigAddress),
    accountId: multisigAddress,
    cryptoType: CryptoType.SR25519,
    chainType: ChainType.SUBSTRATE,
    name,
    signatories,
    threshold,
    matrixRoomId,
    signingType: SigningType.MULTISIG,
    creator,
    isMain: false,
    isActive: true,
  } as MultisigAccount;
}
