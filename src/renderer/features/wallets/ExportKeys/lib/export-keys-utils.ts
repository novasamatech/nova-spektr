import { AccountId, ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { DynamicDerivationsExport, ExportedDerivation } from '@features/wallets/ExportKeys/lib/types';
import { accountUtils } from '@entities/wallet';
import { chainsService } from '@entities/network';

export const exportKeysUtils = {
  getExportStructure,
};

function getExportStructure(
  rootAccountId: AccountId,
  accounts: Array<ChainAccount | ShardAccount>,
): DynamicDerivationsExport {
  const groupedAccounts = accountUtils.getAccountsAndShardGroups(accounts);

  const accountByChain = groupedAccounts.reduce<Record<ChainId, ExportedDerivation[]>>((acc, account) => {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (acc[chainId]) {
      acc[chainId].push(accountToDerivationExport(account));

      return acc;
    }

    acc[chainId] = [accountToDerivationExport(account)];

    return acc;
  }, {});

  return { [rootAccountId]: accountByChain, version: '1' };
}

function accountToDerivationExport(account: ChainAccount | ShardAccount[]): ExportedDerivation {
  if (Array.isArray(account)) {
    const shard = account[0];

    return {
      key: {
        derivation_path: shard.derivationPath.slice(0, shard.derivationPath.lastIndexOf('//')),
        type: shard.keyType,
        name: shard.name,
        sharded: account.length,
      },
    };
  }

  // legacy multishards has empty derivation path for chain account
  const derivationPath = account.derivationPath || `//${chainsService.getChainById(account.chainId)?.specName}`;

  return {
    key: {
      derivation_path: derivationPath,
      type: account.keyType,
      name: account.name,
    },
  };
}
