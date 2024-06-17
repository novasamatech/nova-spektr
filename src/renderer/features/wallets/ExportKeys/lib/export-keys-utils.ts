import { AccountId, ChainAccount, ChainId, ShardAccount } from '@shared/core';
import { accountUtils } from '@entities/wallet';
import { chainsService } from '@shared/api/network';

export const exportKeysUtils = {
  getExportStructure,
};

function getExportStructure(rootAccountId: AccountId, accounts: Array<ChainAccount | ShardAccount[]>): string {
  const set = new Set<ChainId>();
  let output = `version: 1\n`;
  output += `public address: ${rootAccountId}\n`;

  accounts.forEach((account) => {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (!set.has(chainId)) {
      set.add(chainId);
      output += `hash: ${chainId}\n`;
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
