import { chainsService } from '@/shared/api/network';
import { type ChainId, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

export const exportKeysUtils = {
  getExportStructure,
};

const IMPORT_FILE_VERSION = 1;

function getExportStructure(rootAccountId: AccountId, accounts: (VaultChainAccount | VaultShardAccount[])[]): string {
  const set = new Set<ChainId>();
  let output = `version: ${IMPORT_FILE_VERSION}\n`;
  output += `public address: ${rootAccountId}\n`;

  for (const account of accounts) {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (!set.has(chainId)) {
      set.add(chainId);
      output += `genesis: ${chainId}\n`;
    }
    output += accountToDerivationExport(account);
  }

  return output;
}

function accountToDerivationExport(account: VaultChainAccount | VaultShardAccount[]): string {
  const isSharded = accountUtils.isAccountWithShards(account);
  const data = isSharded ? account[0] : account;
  const derivationPath = isSharded
    ? `${data.derivationPath}...${account.length}`
    : data.derivationPath || `//${chainsService.getChainById(data.chainId)?.specName}`; // legacy multishards has empty derivation path for chain account

  return `${derivationPath}: ${data.name} [${data.keyType}]\n`;
}
