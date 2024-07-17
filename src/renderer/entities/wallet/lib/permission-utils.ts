import { type Wallet } from '@shared/core';
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

function canTransfer(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) return accountUtils.isAnyProxyType(wallet.accounts[0]);

  return true;
}

function canReceive(wallet: Wallet): boolean {
  return !walletUtils.isWatchOnly(wallet);
}

function canStake(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);
    const isStaking = accountUtils.isStakingProxyType(wallet.accounts[0]);

    return isAnyProxy || isNonTransfer || isStaking;
  }

  return true;
}
function canCreateMultisigTx(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isMultisig(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);

    return isAnyProxy || isNonTransfer;
  }

  return true;
}
function canApproveMultisigTx(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isMultisig(wallet)) return false;

  if (walletUtils.isProxied(wallet)) {
    return false;

    // TODO: Uncomment when we support proxied wallets for approve mst
    // const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    // const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);

    // return isAnyProxy || isNonTransfer;
  }

  return true;
}
function canRejectMultisigTx(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isMultisig(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    return false;

    // TODO: Uncomment when we support proxied wallets for reject mst
    // const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    // const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);

    // return isAnyProxy || isNonTransfer;
  }

  return true;
}

function canCreateAnyProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    return accountUtils.isAnyProxyType(wallet.accounts[0]);
  }

  return true;
}

function canCreateNonAnyProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);

    return isAnyProxy || isNonTransfer;
  }

  return true;
}

function canRemoveProxy(wallet: Wallet): boolean {
  if (walletUtils.isWatchOnly(wallet)) return false;
  if (walletUtils.isProxied(wallet)) {
    const isAnyProxy = accountUtils.isAnyProxyType(wallet.accounts[0]);
    const isNonTransfer = accountUtils.isNonTransferProxyType(wallet.accounts[0]);

    return isAnyProxy || isNonTransfer;
  }

  return true;
}
