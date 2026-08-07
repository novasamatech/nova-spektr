import { type PolkadotVaultWallet } from '@/shared/core';
import { accountUtils } from '@/entities/wallet';

import { ForgetStep, ReconnectStep } from './constants';
import { type VaultMap, UNIVERSAL_KEYS_GROUP } from './types';

export const wcDetailsUtils = {
  isNotStarted,
  isReconnecting,
  isRejected,
  isReadyToReconnect,
  isFailed,
};

export const walletDetailsUtils = {
  isForgetModalOpen,
  getVaultAccountsMap,
};

function isNotStarted(step: ReconnectStep, connected: boolean): boolean {
  return step === ReconnectStep.NOT_STARTED && connected;
}

function isReconnecting(step: ReconnectStep): boolean {
  return step === ReconnectStep.RECONNECTING;
}

function isRejected(step: ReconnectStep): boolean {
  return step === ReconnectStep.REJECTED;
}

function isFailed(step: ReconnectStep): boolean {
  return step === ReconnectStep.FAILED;
}

function isReadyToReconnect(step: ReconnectStep, connected: boolean): boolean {
  return isRejected(step) || (step === ReconnectStep.NOT_STARTED && !connected);
}

function isForgetModalOpen(step: ForgetStep): boolean {
  return [ForgetStep.FORGETTING, ForgetStep.SUCCESS].includes(step);
}

function getVaultAccountsMap(accounts: PolkadotVaultWallet['accounts']): VaultMap {
  const accountGroups = accountUtils.getAccountsAndShardGroups(accounts);

  return accountGroups.reduce<VaultMap>((acc, account) => {
    const accountToInsert = accountUtils.isAccountWithShards(account) ? account[0] : account;

    const groupId = accountToInsert && 'chainId' in accountToInsert ? accountToInsert.chainId : UNIVERSAL_KEYS_GROUP;
    if (acc[groupId]) {
      acc[groupId]!.push(account);
    } else {
      acc[groupId] = [account];
    }

    return acc;
  }, {});
}
