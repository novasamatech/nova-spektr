import { type ChainId, type VaultChainAccount, type VaultShardAccount, type Wallet } from '@/shared/core';
import { downloadFiles, nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

const IMPORT_FILE_VERSION = 1;

function getExportStructure(rootAccountId: AccountId, accounts: (VaultChainAccount | VaultShardAccount[])[]): string {
  const set = new Set<ChainId>();
  let output = `version: ${IMPORT_FILE_VERSION}\n`;
  output += `public address: ${rootAccountId}\n`;

  for (const account of accounts) {
    const chainId = Array.isArray(account) ? account[0]?.chainId : account.chainId;
    if (nullable(chainId)) continue;
    if (!set.has(chainId)) {
      set.add(chainId);
      output += `genesis: ${chainId}\n`;
    }
    output += accountUtils.getDerivationPath(account) + '\n';
  }

  return output;
}

function exportVaultWallet(
  wallet: Wallet,
  rootAccountId: AccountId,
  accounts: (VaultChainAccount | VaultShardAccount[])[],
) {
  const exportStructure = getExportStructure(rootAccountId, accounts);

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
