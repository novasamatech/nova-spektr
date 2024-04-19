import { Account_NEW, Wallet_NEW } from '@shared/core';
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

function canTransfer(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]);
  }

  return true;
}

function canReceive(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canStake(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
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
function canCreateMultisigTx(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
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
function canApproveMultisigTx(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
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
function canRejectMultisigTx(wallet: Wallet_NEW): boolean {
  if (walletUtils.isProxied(wallet)) {
    return accountUtils.isAnyProxyType(wallet.accounts[0]) || accountUtils.isNonTransferProxyType(wallet.accounts[0]);
  }

  if (walletUtils.isWatchOnly(wallet)) return false;

  return !walletUtils.isMultisig(wallet);
}

function canCreateAnyProxy(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]);
  }

  return true;
}

function canCreateNonAnyProxy(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}

function canRemoveProxy(wallet: Wallet_NEW, accounts: Account_NEW[]): boolean {
  if (walletUtils.isWatchOnly(wallet)) {
    return false;
  }

  if (walletUtils.isProxied(wallet) && accountUtils.isProxiedAccount(accounts[0])) {
    return accountUtils.isAnyProxyType(accounts[0]) || accountUtils.isNonTransferProxyType(accounts[0]);
  }

  return true;
}
