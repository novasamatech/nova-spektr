import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';

import { AccountType, ChainId } from '@renderer/shared/core';
import type {
  AccountId,
  Threshold,
  MultisigAccount,
  Account,
  BaseAccount,
  ChainAccount,
  WalletConnectAccount,
} from '@renderer/shared/core';

export const accountUtils = {
  isBaseAccount,
  isChainAccount,
  isMultisigAccount,
  isChainIdMatch,
  isWalletConnectAccount,
  getMultisigAccountId,
  getAllAccountIds,
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

function isWalletConnectAccount(account: Pick<Account, 'type'>): account is WalletConnectAccount {
  return account.type === AccountType.WALLET_CONNECT;
}

function isChainIdMatch(account: Pick<Account, 'type'>, chainId: ChainId): boolean {
  if (isBaseAccount(account) || isMultisigAccount(account)) return true;

  const chainAccountMatch = isChainAccount(account) && account.chainId === chainId;
  const walletConnectAccountMatch = isWalletConnectAccount(account) && account.chainId === chainId;

  return chainAccountMatch || walletConnectAccountMatch;
}
function isMultisigAccount(account: Pick<Account, 'type'>): account is MultisigAccount {
  return account.type === AccountType.MULTISIG;
}

function getAllAccountIds(accounts: Account[], chainId: ChainId): AccountId[] {
  const uniqIds = accounts.reduce<Set<AccountId>>((acc, account) => {
    if (accountUtils.isChainIdMatch(account, chainId)) {
      acc.add(account.accountId);
    }

    if (accountUtils.isMultisigAccount(account)) {
      account.signatories.forEach((signatory) => acc.add(signatory.accountId));
    }

    return acc;
  }, new Set());

  return Array.from(uniqIds);
}
