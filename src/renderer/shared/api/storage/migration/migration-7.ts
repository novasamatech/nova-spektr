import { type Transaction } from 'dexie';

import { CryptoType, type Wallet } from '@/shared/core';
import { isEthereumAccountId } from '@/shared/lib/utils/address';
import { type AnyAccount } from '@/domains/network';
import { walletUtils } from '@/entities/wallet';

/**
 * Migration to fix cryptoType for connected EVM accounts
 */
export async function migrateEVMAccountsCryptoType(t: Transaction): Promise<void> {
  const wallets = await t.db.table<Wallet>('wallets').toArray();
  const accounts = await t.table<AnyAccount>('accounts2').toArray();

  const accountsToUpdate = accounts.map((account) => {
    const wallet = wallets.find((wallet) => wallet.id === account.walletId);

    if (walletUtils.isWalletConnect(wallet)) {
      return {
        ...account,
        cryptoType: isEthereumAccountId(account.accountId) ? CryptoType.ETHEREUM : account.cryptoType,
      };
    } else {
      return account;
    }
  });

  await t.table('accounts2').bulkPut(accountsToUpdate);
}
