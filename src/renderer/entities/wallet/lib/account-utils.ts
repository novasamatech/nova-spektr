import { u8aToHex } from '@polkadot/util';
import { createKeyMulti } from '@polkadot/util-crypto';
import { keyBy } from 'lodash';

// TODO: resolve cross import
import {
  AccountType,
  type Chain,
  type ChainId,
  CryptoType,
  type FlexibleMultisigAccount,
  type FlexibleProxiedAccount,
  type MultisigAccount,
  type MultisigSignatoryAccount,
  type ProxiedAccount,
  ProxyVariant,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
  type WatchOnlyAccount,
  type WcAccount,
} from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, accountService } from '@/domains/network';
import { networkUtils } from '@/entities/network';

import { walletUtils } from './wallet-utils';

export const accountUtils = {
  isWatchOnlyAccount,
  isVaultBaseAccount,
  isVaultChainAccount,
  isVaultShardAccount,
  isMultisigAccount,
  isFlexibleMultisigAccount,
  isAnyMultisigAccount,
  isMultisigSignatoryAccount,
  isWcAccount,
  isProxiedAccount,
  isFlexibleProxiedAccount,
  isAnyProxied,
  isPureProxiedAccount,

  /**
   * @deprecated Use accountService.isAccountAvailableOnChain instead
   */
  isChainIdMatch,
  /**
   * @deprecated Use accountService.isAccountAvailableOnChain instead
   */
  isChainAndCryptoMatch,
  isAccountWithShards,
  isNonBaseVaultAccount,
  isEthereumBased,
  isCryptoTypeMatch,

  getAddressesForWallet,
  getAccountsIdsForWallet,
  getAccountsAndShardGroups,
  getMultisigAccountId,
  getSignatoryAccounts,
  getDerivationPath,

  isAnyProxyType,
  isNonTransferProxyType,
  isStakingProxyType,
  isGovernanceProxyType,
};

// Account types

function isWatchOnlyAccount(account: Partial<AnyAccount>): account is WatchOnlyAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isUniversalAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WATCH_ONLY
  );
}

function isVaultBaseAccount(account: Partial<AnyAccount>): account is VaultBaseAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isUniversalAccount(account) && 'accountType' in account && account.accountType === AccountType.BASE
  );
}

function isVaultChainAccount(account: Partial<AnyAccount>): account is VaultChainAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.CHAIN
  );
}

function isWcAccount(account: Partial<AnyAccount>): account is WcAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.WALLET_CONNECT
  );
}

function isVaultShardAccount(account: Partial<AnyAccount>): account is VaultShardAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.SHARD
  );
}

function isMultisigAccount(account: Partial<AnyAccount>): account is MultisigAccount {
  return 'accountType' in account && account.accountType === AccountType.MULTISIG;
}

function isFlexibleMultisigAccount(account: Partial<AnyAccount>): account is FlexibleMultisigAccount {
  return 'accountType' in account && account.accountType === AccountType.FLEX_MULTISIG;
}

function isAnyMultisigAccount(account: Partial<AnyAccount>): account is MultisigAccount | FlexibleMultisigAccount {
  return isMultisigAccount(account) || isFlexibleMultisigAccount(account);
}

function isMultisigSignatoryAccount(account: Partial<AnyAccount>): account is MultisigSignatoryAccount {
  return 'accountType' in account && account.accountType === AccountType.MULTISIG_SIGNATORY;
}

function isProxiedAccount(account: Partial<AnyAccount>): account is ProxiedAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) && 'accountType' in account && account.accountType === AccountType.PROXIED
  );
}

function isFlexibleProxiedAccount(account: Partial<AnyAccount>): account is FlexibleProxiedAccount {
  return (
    // @ts-expect-error Partial type breaks required type field usage
    accountService.isChainAccount(account) &&
    'accountType' in account &&
    account.accountType === AccountType.FLEX_PROXIED
  );
}

function isAnyProxied(account: Partial<AnyAccount>): account is ProxiedAccount | FlexibleProxiedAccount {
  return isProxiedAccount(account) || isFlexibleProxiedAccount(account);
}

function isPureProxiedAccount(account: Partial<AnyAccount>): account is ProxiedAccount {
  return isProxiedAccount(account) && account.proxyVariant === ProxyVariant.PURE;
}

// Matchers

function isAccountWithShards(accounts: AnyAccount | VaultShardAccount[]): accounts is VaultShardAccount[] {
  return Array.isArray(accounts) && isVaultShardAccount(accounts[0]);
}

function isChainIdMatch(account: AnyAccount, chainId: ChainId): boolean {
  if (!accountService.isChainAccount(account)) return true;

  return account.chainId === chainId;
}

/**
 * Checks if account is available on chain
 *
 * @deprecated Use accountService.isAccountAvailableOnChain instead
 */
function isChainAndCryptoMatch(account: AnyAccount, chain: Chain): boolean {
  return accountService.isChainAccount(account)
    ? isChainIdMatch(account, chain.chainId)
    : isCryptoTypeMatch(account, chain);
}

function isCryptoTypeMatch(account: AnyAccount, chain: Chain): boolean {
  // TODO check this logic, should be incorrect
  if (isWcAccount(account)) {
    return true;
  }

  const cryptoTypes = networkUtils.isEthereumBased(chain.options)
    ? [CryptoType.ECDSA, CryptoType.ETHEREUM]
    : [CryptoType.SR25519, CryptoType.ED25519];

  return cryptoTypes.includes(account.cryptoType);
}

function isEthereumBased(account: AnyAccount): boolean {
  return account.cryptoType === CryptoType.ETHEREUM;
}

// Get specific accounts

function getMultisigAccountId(signatories: AccountId[], threshold: number, cryptoType: CryptoType): AccountId {
  const accountId = createKeyMulti(signatories, threshold);
  const isEthereum = cryptoType === CryptoType.ETHEREUM;

  // TODO WTF
  return u8aToHex(isEthereum ? accountId.subarray(0, 20) : accountId) as AccountId;
}

function getAccountsAndShardGroups(accounts: AnyAccount[]): (VaultChainAccount | VaultShardAccount[])[] {
  const shardsIndexes: Record<string, number> = {};

  return accounts.reduce<(VaultChainAccount | VaultShardAccount[])[]>((acc, account) => {
    if (isVaultBaseAccount(account)) return acc;

    if (!isVaultShardAccount(account)) {
      // @ts-expect-error TODO fix
      acc.push(account);

      return acc;
    }

    const existingGroupIndex = shardsIndexes[(account as VaultShardAccount).groupId];
    if (existingGroupIndex !== undefined) {
      (acc[existingGroupIndex] as VaultShardAccount[]).push(account);
    } else {
      acc.push([account]);
      shardsIndexes[(account as VaultShardAccount).groupId] = acc.length - 1;
    }

    return acc;
  }, []);
}

function getSignatoryAccounts<T extends VaultBaseAccount>(accountIds: AccountId[], accounts: T[]): T[] {
  const accountsMap = keyBy(accounts, 'accountId');

  return accountIds.map((id) => accountsMap[id]);
}

type DerivationPathLike = {
  derivationPath: string;
};

function getDerivationPath(data: DerivationPathLike | DerivationPathLike[]): string {
  if (!Array.isArray(data)) return data.derivationPath;

  return data[0].derivationPath.replace(/\d+$/, `0..${data.length - 1}`);
}

// Proxied accounts

function isAnyProxyType(account: ProxiedAccount): boolean {
  return account.connections.some((c) => c.proxyType === 'Any');
}

function isNonTransferProxyType(account: ProxiedAccount): boolean {
  return account.connections.some((c) => c.proxyType === 'NonTransfer');
}

function isStakingProxyType(account: ProxiedAccount): boolean {
  return account.connections.some((c) => c.proxyType === 'Staking');
}

function isGovernanceProxyType(account: ProxiedAccount): boolean {
  return account.connections.some((c) => c.proxyType === 'Governance');
}

/**
 * @deprecated This predicate exists only because both "watch only" and PV
 *   "root" accounts implemented with BaseAccount interface. After introducing
 *   `WatchOnly` account type this check can be reduced to
 *   `!accountUtils.isVaultBaseAccount(account)`.
 */
function isNonBaseVaultAccount(account: AnyAccount, wallet: Wallet): boolean {
  return !walletUtils.isPolkadotVault(wallet) || !accountUtils.isVaultBaseAccount(account);
}

function getAccountsIdsForWallet(wallet: Wallet, chain: Chain) {
  const matchedAccounts = walletUtils.getAccountsBy([wallet], (account) => {
    return isNonBaseVaultAccount(account, wallet) && isChainIdMatch(account, chain.chainId);
  });

  return matchedAccounts.map((a) => a.accountId);
}

function getAddressesForWallet(wallet: Wallet, chain: Chain) {
  return getAccountsIdsForWallet(wallet, chain).map((id) => toAddress(id, { prefix: chain.addressPrefix }));
}
