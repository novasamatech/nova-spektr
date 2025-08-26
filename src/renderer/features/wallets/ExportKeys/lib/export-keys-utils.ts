import { type Chain, type ChainId, type VaultChainAccount, type VaultShardAccount, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

import { downloadFiles } from './download-multiple-files';

const IMPORT_FILE_VERSION = 1;

function getExportStructure(
  rootAccountId: AccountId,
  accounts: (VaultChainAccount | VaultShardAccount[])[],
  chains: Record<ChainId, Chain>,
): string {
  const set = new Set<ChainId>();
  let output = `version: ${IMPORT_FILE_VERSION}\n`;
  output += `public address: ${rootAccountId}\n`;

  for (const account of accounts) {
    const chainId = Array.isArray(account) ? account[0].chainId : account.chainId;
    if (!set.has(chainId)) {
      set.add(chainId);
      output += `genesis: ${chainId}\n`;
    }
    output += accountToDerivationExport(account, chains[chainId].specName);
  }

  return output;
}

function accountToDerivationExport(account: VaultChainAccount | VaultShardAccount[], chainSpecName: string): string {
  if (accountUtils.isAccountWithShards(account)) {
    const derivationPath = `${account[0].derivationPath}...${account.length}`;

    return `${derivationPath}: ${account[0].name} [${account[0].keyType}]\n`;
  }

  const derivationPath = account.derivationPath || `//${chainSpecName}`;

  return `${derivationPath}: ${account.name} [${account.keyType}]\n`;
}

function exportVaultWallet(
  wallet: Wallet,
  rootAccountId: AccountId,
  accounts: (VaultChainAccount | VaultShardAccount[])[],
  chains: Record<ChainId, Chain>,
) {
  const exportStructure = getExportStructure(rootAccountId, accounts, chains);

  downloadFiles([
    {
      blob: new Blob([exportStructure], { type: 'text/plain' }),
      fileName: `${wallet.name}.txt`,
    },
  ]);
}

export const exportKeysUtils = {
  exportVaultWallet,
};
