import { Account, ProxiedAccount, Wallet } from '@shared/core';
import { walletUtils } from './wallet-utils';

export const permissionUtils = {
  isTransferAvailable,
  isReceiveAvailable,
  isStakingAvailable,
  isCreateMultisigTxAvailable,
  isApproveMultisigTxAvailable,
  isRejectMultisigTxAvailable,
  isCreateAnyProxyAvailable,
  isCreateNonAnyProxyAvailable,
  isRemoveProxyAvailable,
};

function isTransferAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account);
  }

  return true;
}

function isReceiveAvailable(wallet: Wallet, accounts: Account[]): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function isStakingAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return (
      walletUtils.isAnyProxyType(account) ||
      walletUtils.isStakingProxyType(account) ||
      walletUtils.isNonTransferProxyType(account)
    );
  }

  return true;
}
function isCreateMultisigTxAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account) || walletUtils.isNonTransferProxyType(account);
  }

  return true;
}
function isApproveMultisigTxAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account) || walletUtils.isNonTransferProxyType(account);
  }

  return true;
}
function isRejectMultisigTxAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account) || walletUtils.isNonTransferProxyType(account);
  }

  return true;
}

function isCreateAnyProxyAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account);
  }

  return true;
}

function isCreateNonAnyProxyAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account) || walletUtils.isNonTransferProxyType(account);
  }

  return true;
}

function isRemoveProxyAvailable(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet)) {
    const account = accounts[0] as ProxiedAccount;

    return walletUtils.isAnyProxyType(account) || walletUtils.isNonTransferProxyType(account);
  }

  return true;
}
