import { type Transaction } from 'dexie';

import { type Account, ChainType, CryptoType, type Wallet } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';

/**
 * Migrate accounts table to accounts2 for supporting new format
 *
 * @param trans Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateAccounts(t: Transaction): Promise<void> {
  const oldAccounts = await t.db.table<Account>('accounts').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const newAccounts = oldAccounts
    .map<Account | null>((old) => {
      const wallet = wallets.find((x) => x.id === old.walletId);
      if (!wallet) return null;
      const { chainType, baseId, type, ...mappable } = old;
      const baseAccountId = nonNullable(baseId) ? oldAccounts.find((x) => x.id === baseId) : null;

      const finalType = wallet.type === 'wallet_wo' ? 'watch_only' : type;
      let res: Account;

      if ('chainId' in old) {
        res = {
          ...mappable,
          type: 'chain',
          accountType: finalType,
          accountId: pjsSchema.helpers.toAccountId(old.accountId),
          chainId: old.chainId,
          cryptoType: chainType === ChainType.SUBSTRATE ? CryptoType.SR25519 : CryptoType.ETHEREUM,
          name: old.name,
          signingType: wallet.signingType,
        };
      } else {
        res = {
          ...mappable,
          type: 'universal',
          accountType: finalType,
          accountId: pjsSchema.helpers.toAccountId(old.accountId),
          cryptoType: chainType === ChainType.SUBSTRATE ? CryptoType.SR25519 : CryptoType.ETHEREUM,
          name: old.name,
          signingType: wallet.signingType,
        };
      }

      // clone of networkDomain.accountsService.uniqId method.
      const id =
        res.type === 'universal'
          ? `${res.walletId} ${res.accountId} universal`
          : `${res.walletId} ${res.accountId} ${res.chainId}`;

      res.id = id;

      if (baseAccountId) {
        res.baseAccountId = baseAccountId;
      }

      return res;
    })
    .filter(nonNullable);

  await t.table('accounts2').bulkPut(newAccounts);
}
