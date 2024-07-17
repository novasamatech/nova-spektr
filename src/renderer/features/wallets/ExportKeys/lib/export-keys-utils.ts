import { type AccountId, type ChainAccount, type ChainId, type ShardAccount } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { chainsService } from '@shared/api/network';

export const exportKeysUtils = {
  getExportStructure,
};

const IMPORT_FILE_VERSION = 1;

function getExportStructure(rootAccountId: AccountId, accounts: Array<ChainAccount | ShardAccount[]>): string {
  const set = new Set<ChainId>();
  let output = `version: ${IMPORT_FILE_VERSION}\n`;
  output += `public address: ${rootAccountId}\n`;

  accounts.forEach((account) => {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (!set.has(chainId)) {
      set.add(chainId);
      output += `genesis: ${chainId}\n`;
    }
    output += accountToDerivationExport(account);
  });

  return output;
}

function accountToDerivationExport(account: ChainAccount | ShardAccount[]): string {
  const isSharded = accountUtils.isAccountWithShards(account);
  const data = isSharded ? account[0] : account;
  const derivationPath = isSharded
    ? `${data.derivationPath}...${account.length}`
    : data.derivationPath || `//${chainsService.getChainById(data.chainId)?.specName}`; // legacy multishards has empty derivation path for chain account

  return `${derivationPath}: ${data.name} [${data.keyType}]\n`;
}
