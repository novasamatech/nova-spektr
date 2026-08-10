import {
  type ChainId,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
  type Wallet,
} from '@/shared/core';
import { UNIVERSAL_GENESIS, downloadFiles } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { accountUtils } from '@/entities/wallet';

const IMPORT_FILE_VERSION = 1;

type ExportAccount = VaultChainAccount | VaultUniversalKeyAccount | VaultShardAccount[];

function getExportStructure(rootAccountId: AccountId, accounts: ExportAccount[]): string {
  const set = new Set<ChainId | typeof UNIVERSAL_GENESIS>();
  let output = `version: ${IMPORT_FILE_VERSION}\n`;
  output += `public address: ${rootAccountId}\n`;

  for (const account of accounts) {
    const scoped = Array.isArray(account) ? account[0] : account;
    if (!scoped) continue;

    // Keys with no network scope are written under a `universal` section. Older
    // app versions don't know the marker and skip those keys rather than
    // misfiling them under whatever section came before.
    const genesis = 'chainId' in scoped ? scoped.chainId : UNIVERSAL_GENESIS;
    if (!set.has(genesis)) {
      set.add(genesis);
      output += `genesis: ${genesis}\n`;
    }
    output += accountUtils.getDerivationPath(account) + '\n';
  }

  return output;
}

function exportVaultWallet(wallet: Wallet, rootAccountId: AccountId, accounts: ExportAccount[]) {
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
