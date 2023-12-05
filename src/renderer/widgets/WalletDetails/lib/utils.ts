import { ForgetStep, ReconnectStep } from './constants';
import { VaultMap, MultishardMap } from './types';
import { accountUtils } from '@entities/wallet';
import { Account, BaseAccount, ChainId, ChainAccount } from '@shared/core';

export const wcDetailsUtils = {
  isNotStarted,
  isReconnecting,
  isRejected,
  isReadyToReconnect,
  isConfirmation,
};

export const walletDetailsUtils = {
  isForgetModalOpen,
  getVaultAccountsMap,
  getMultishardMap,
};

function isNotStarted(step: ReconnectStep, connected: boolean): boolean {
  return [ReconnectStep.NOT_STARTED, ReconnectStep.CONFIRMATION].includes(step) && connected;
}

function isConfirmation(step: ReconnectStep): boolean {
  return step === ReconnectStep.CONFIRMATION;
}

function isReconnecting(step: ReconnectStep): boolean {
  return step === ReconnectStep.RECONNECTING;
}

function isRejected(step: ReconnectStep): boolean {
  return step === ReconnectStep.REJECTED;
}

function isReadyToReconnect(step: ReconnectStep, connected: boolean): boolean {
  return isRejected(step) || (step === ReconnectStep.NOT_STARTED && !connected);
}

function isForgetModalOpen(step: ForgetStep): boolean {
  return [ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(step);
}

function getVaultAccountsMap(accounts: Account[]): VaultMap {
  const accountGroups = accountUtils.getAccountsAndShardGroups(accounts);

  return accountGroups.reduce<VaultMap>((acc, account) => {
    const accountToInsert = accountUtils.isAccountWithShards(account) ? account[0] : account;

    const chainId = accountToInsert.chainId;
    if (acc[chainId]) {
      acc[chainId].push(account);
    } else {
      acc[chainId] = [account];
    }

    return acc;
  }, {});
}

function getMultishardMap(accounts: Account[]): MultishardMap {
  return accounts.reduce<Map<BaseAccount, Record<ChainId, ChainAccount[]>>>((acc, account) => {
    if (accountUtils.isBaseAccount(account)) {
      acc.set(account, {});
    }

    if (accountUtils.isChainAccount(account)) {
      for (const [baseAccount, chainMap] of acc.entries()) {
        if (baseAccount.id !== account.baseId) continue;

        if (chainMap[account.chainId]) {
          chainMap[account.chainId].push(account);
        } else {
          chainMap[account.chainId] = [account];
        }
        break;
      }
    }

    return acc;
  }, new Map());
}
