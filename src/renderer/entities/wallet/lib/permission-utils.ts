import { Account, Wallet } from '@shared/core';
import { walletUtils } from './wallet-utils';
import { accountUtils } from './account-utils';

export const permissionUtils = {
  canTransfer,
  canReceive,
  canStake,
  canCreateMultisigTx,
  canApproveMultisigTx,
  canRejectMultisigTx,
  canCreateAnyProxy,
  canCreateNonAnyProxy,
  canRemoveProxy,
};

function canTransfer(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]);
  }

  return true;
}

function canReceive(wallet: Wallet, accounts: Account[]): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canStake(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return (
      accountUtils.isAnyProxyType(accounts[0]) ||
      accountUtils.isStakingProxyType(accounts[0]) ||
      accountUtils.isNonTransferProxyType(accounts[0])
    );
  }

  return true;
}
function canCreateMultisigTx(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}
function canApproveMultisigTx(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}
function canRejectMultisigTx(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isMultisig(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}

function canCreateAnyProxy(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]);
  }

  return true;
}

function canCreateNonAnyProxy(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}

function canRemoveProxy(wallet: Wallet, accounts: Account[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}
