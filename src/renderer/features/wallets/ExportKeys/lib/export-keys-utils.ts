import { AccountId, ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { DynamicDerivationsExport, ExportedDerivation } from '@features/wallets/ExportKeys/lib/types';
import { accountUtils } from '@entities/wallet';
import { chainsService } from '@shared/api/network';

export const exportKeysUtils = {
  getExportStructure,
};

function getExportStructure(
  rootAccountId: AccountId,
  accounts: Array<ChainAccount | ShardAccount[]>,
): DynamicDerivationsExport {
  const accountsByChain = accounts.reduce<Record<ChainId, ExportedDerivation[]>>((acc, account) => {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (acc[chainId]) {
      acc[chainId].push(accountToDerivationExport(account));
    } else {
      acc[chainId] = [accountToDerivationExport(account)];
    }

    return acc;
  }, {});

  return { [rootAccountId]: accountsByChain, version: '1' };
}

function accountToDerivationExport(account: ChainAccount | ShardAccount[]): ExportedDerivation {
  const isSharded = accountUtils.isAccountWithShards(account);
  const data = isSharded ? account[0] : account;
  const derivationPath = isSharded
    ? data.derivationPath.slice(0, data.derivationPath.lastIndexOf('//'))
    : data.derivationPath || `//${chainsService.getChainById(data.chainId)?.specName}`; // legacy multishards has empty derivation path for chain account

  return {
    key: {
      derivation_path: derivationPath,
      type: data.keyType,
      name: data.name,
      ...(isSharded && { sharded: account.length.toString() }),
    },
  };
}
