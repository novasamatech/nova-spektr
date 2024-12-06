import {
  type BaseAccount,
  type ChainAccount,
  type ChainId,
  KeyType,
  type MultiShardWallet,
  type PolkadotVaultWallet,
  type ShardAccount,
  type Wallet,
} from '@/shared/core';
import { accountUtils } from '@/entities/wallet';
import { downloadFiles, exportKeysUtils } from '@/features/wallets/ExportKeys';

import { ForgetStep, ReconnectStep } from './constants';
import { type MultishardMap, type VaultMap } from './types';

export const wcDetailsUtils = {
  isNotStarted,
  isReconnecting,
  isRejected,
  isReadyToReconnect,
  isConfirmation,
  isFailed,
  isRefreshAccounts,
};

export const walletDetailsUtils = {
  isForgetModalOpen,
  getVaultAccountsMap,
  getMultishardMap,
  exportMultishardWallet,
  exportVaultWallet,
  getMainAccounts,
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

function isFailed(step: ReconnectStep): boolean {
  return step === ReconnectStep.FAILED;
}

function isRefreshAccounts(step: ReconnectStep): boolean {
  return step === ReconnectStep.REFRESH_ACCOUNTS;
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

function getMultishardMap(accounts: MultiShardWallet['accounts']): MultishardMap {
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

function exportMultishardWallet(wallet: Wallet, accounts: MultishardMap) {
  const rootsAndAccounts = Array.from(accounts, ([root, accounts]) => ({ root, accounts }));
  const downloadData = rootsAndAccounts.map(({ root, accounts }, index) => {
    const accountsFlat = Object.values(accounts).flat();
    const exportStructure = exportKeysUtils.getExportStructure(root.accountId, accountsFlat);

    return {
      blob: new Blob([exportStructure], { type: 'text/plain' }),
      fileName: wallet.name + (rootsAndAccounts.length > 1 ? ` ${index}` : '') + '.txt',
    };
  });

  downloadFiles(downloadData);
}

function exportVaultWallet(wallet: Wallet, root: BaseAccount, accounts: VaultMap) {
  const accountsFlat = Object.values(accounts).flat();
  const exportStructure = exportKeysUtils.getExportStructure(root.accountId, accountsFlat);

  downloadFiles([
    {
      blob: new Blob([exportStructure], { type: 'text/plain' }),
      fileName: `${wallet.name}.txt`,
    },
  ]);
}

function getMainAccounts(accounts: (ChainAccount | ShardAccount[])[]): ChainAccount[] {
  return accounts.filter((account) => {
    return !accountUtils.isAccountWithShards(account) && account.keyType === KeyType.MAIN;
  }) as ChainAccount[];
}
