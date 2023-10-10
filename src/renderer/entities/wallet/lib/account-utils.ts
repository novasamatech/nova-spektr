import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import { AccountType, ChainId } from '@renderer/shared/core';
import type { AccountId, Threshold, MultisigAccount, Account, BaseAccount, ChainAccount } from '@renderer/shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainIdMatch,
  getMultisigAccountId,
};

function getMultisigAccountId(ids: AccountId[], threshold: Threshold): AccountId {
  return u8aToHex(createKeyMulti(ids, threshold));
}

function isBaseAccount(account: Pick<Account, 'type'>): account is BaseAccount {
  return account.type === AccountType.BASE;
}

function isChainAccount(account: Pick<Account, 'type'>): account is ChainAccount {
  return account.type === AccountType.CHAIN;
}

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  return !isChainAccount(account) || account.chainId === chainId;
}

function isMultisigAccount(account: Pick<Account, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

// function isWalletContact(account?: Account | MultisigAccount): boolean {
//   if (!account) return false;
//
//   return account.signingType !== SigningType.WATCH_ONLY && !isMultisig(account);
// }
//
// function isVaultAccount(account?: Account | MultisigAccount): boolean {
//   if (!account) return false;
//
//   return account.signingType === SigningType.PARITY_SIGNER;
// }
//
// function getActiveWalletType(activeAccounts?: Account[]): WalletType | null {
//   if (!activeAccounts?.length) return null;
//
//   if (activeAccounts.length > 1) {
//     return WalletType.MULTISHARD_PARITY_SIGNER;
//   }
//
//   const account = activeAccounts[0];
//   if (isMultisig(account)) {
//     return WalletType.MULTISIG;
//   }
//
//   if (account.signingType === SigningType.WATCH_ONLY) {
//     return WalletType.WATCH_ONLY;
//   }
//
//   if (account.signingType === SigningType.PARITY_SIGNER) {
//     return WalletType.SINGLE_PARITY_SIGNER;
//   }
//
//   return null;
// }

// export function createMultisigAccount({
//   name,
//   signatories,
//   threshold,
//   matrixRoomId,
//   creatorAccountId,
//   isActive,
// }: Pick<
//   MultisigAccount,
//   'name' | 'signatories' | 'threshold' | 'matrixRoomId' | 'creatorAccountId' | 'isActive'
// >): MultisigAccount {
//   const multisigAccountId = getMultisigAccountId(
//     signatories.map((s) => s.accountId),
//     threshold,
//   );
//
//   return {
//     accountId: multisigAccountId,
//     cryptoType: CryptoType.SR25519,
//     chainType: ChainType.SUBSTRATE,
//     name,
//     signatories,
//     threshold,
//     matrixRoomId,
//     signingType: SigningType.MULTISIG,
//     creatorAccountId,
//     isActive,
//   } as MultisigAccount;
// }
