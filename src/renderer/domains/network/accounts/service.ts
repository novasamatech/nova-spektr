import { type Chain, CryptoType } from '@/shared/core';
import { createAnyOf } from '@/shared/di';
import { networkUtils } from '@/entities/network';

import { type AnyAccount, type AnyAccountDraft, type ChainAccount, type UniversalAccount } from './types';

const accountAvailabilityOnChainAnyOf = createAnyOf<{ account: UniversalAccount; chain: Chain }>();
const accountActionPermissionAnyOf = createAnyOf<{ account: AnyAccount }>();

function isCryptoMatch(account: Pick<AnyAccount, 'cryptoType'>, chain: Chain): boolean {
  const cryptoType = networkUtils.isEthereumBased(chain.options) ? CryptoType.ETHEREUM : CryptoType.SR25519;

  return account.cryptoType === cryptoType;
}

function isChainAccount(account: Pick<AnyAccount, 'type'>): account is ChainAccount {
  return account.type === 'chain';
}

function isUniversalAccount(account: Pick<AnyAccount, 'type'>): account is UniversalAccount {
  return account.type === 'universal';
}

function isAccountAvailableOnChain(account: Pick<AnyAccount, 'type' | 'cryptoType'>, chain: Chain) {
  if (isCryptoMatch(account, chain) === false) {
    return false;
  }

  if (isChainAccount(account)) {
    return account.chainId === chain.chainId;
  }

  if (isUniversalAccount(account)) {
    return accountAvailabilityOnChainAnyOf.check({ account, chain });
  }
}

function filterAccountOnChain(accounts: AnyAccount[], chain: Chain) {
  return accounts.filter(account => isAccountAvailableOnChain(account, chain));
}

function filterAccountsByWallet(accounts: AnyAccount[], walletId: number) {
  return accounts.filter(account => account.walletId === walletId);
}

function hasPermissionToMakeActions(account: AnyAccount) {
  return accountActionPermissionAnyOf.check({ account });
}

/**
 * ATTENTION! This method is the source of stable id for different types of
 * account. If you want to change implementation you should also write db
 * migrations and make regress testing across application to verify that new
 * account id has no collisions.
 */
function uniqId(account: AnyAccountDraft) {
  if (isUniversalAccount(account)) {
    return `${account.walletId} ${account.accountId} universal`;
  }
  if (isChainAccount(account)) {
    return `${account.walletId} ${account.accountId} ${account.chainId}`;
  }

  throw new Error('Unsupported account type.');
}

export const accountsService = {
  accountAvailabilityOnChainAnyOf,
  accountActionPermissionAnyOf,

  uniqId,

  isChainAccount,
  isUniversalAccount,
  isAccountAvailableOnChain,

  hasPermissionToMakeActions,

  filterAccountOnChain,
  filterAccountsByWallet,
};
