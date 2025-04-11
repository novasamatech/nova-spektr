import {
  KeyType,
  type PolkadotVaultWallet,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';
import { downloadFiles, exportKeysUtils } from '@/features/wallets/ExportKeys';

import { ForgetStep, ReconnectStep } from './constants';
import { type VaultMap } from './types';

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
  exportVaultWallet,
  getMainAccounts,
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

    const chainId = accountToInsert.chainId;
    if (acc[chainId]) {
      acc[chainId].push(account);
    } else {
      acc[chainId] = [account];
    }

    return acc;
  }, {});
}

function exportVaultWallet(wallet: Wallet, rootAccountId: AccountId, accounts: VaultMap) {
  const accountsFlat = Object.values(accounts).flat();
  const exportStructure = exportKeysUtils.getExportStructure(rootAccountId, accountsFlat);

  downloadFiles([
    {
      blob: new Blob([exportStructure], { type: 'text/plain' }),
      fileName: `${wallet.name}.txt`,
    },
  ]);
}

function getMainAccounts(accounts: (VaultChainAccount | VaultShardAccount[])[]): VaultChainAccount[] {
  return accounts.filter(account => {
    return !accountUtils.isAccountWithShards(account) && account.keyType === KeyType.MAIN;
  }) as VaultChainAccount[];
}
