import { type Wallet } from '@/shared/core';

import { accountUtils } from './account-utils';
import { walletUtils } from './wallet-utils';

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
  canUnlock,
  canVote,
  canDelegate,
};

function canTransfer(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canReceive(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canStake(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canCreateMultisigTx(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canApproveMultisigTx(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}
function canRejectMultisigTx(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canCreateAnyProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const firstAccount = wallet.accounts[0];
    if (!firstAccount) return false;
    return accountUtils.isAnyProxyType(firstAccount);
  }

  return true;
}

function canCreateNonAnyProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const firstAccount = wallet.accounts[0];
    if (!firstAccount) return false;
    const isAnyProxy = accountUtils.isAnyProxyType(firstAccount);
    const isNonTransfer = accountUtils.isNonTransferProxyType(firstAccount);

    return isAnyProxy || isNonTransfer;
  }

  return true;
}

function canRemoveProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const firstAccount = wallet.accounts[0];
    if (!firstAccount) return false;
    const isAnyProxy = accountUtils.isAnyProxyType(firstAccount);
    const isNonTransfer = accountUtils.isNonTransferProxyType(firstAccount);

    return isAnyProxy || isNonTransfer;
  }

  return true;
}

function canUseGovernance(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canUnlock(wallet: Wallet): boolean {
  return canUseGovernance(wallet);
}

function canVote(wallet: Wallet): boolean {
  return canUseGovernance(wallet);
}

function canDelegate(wallet: Wallet): boolean {
  return canUseGovernance(wallet);
}
