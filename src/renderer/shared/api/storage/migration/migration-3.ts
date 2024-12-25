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
    // @ts-expect-error Mapping of type which no longer exists.
    .map<AnyAccount | null>((old) => {
      const wallet = wallets.find((x) => x.id === old.walletId);
      if (!wallet) return null;
      // @ts-expect-error Mapping of type which no longer exists.
      const { chainType, baseId, type, ...mappable } = old;
      const baseAccountId = nonNullable(baseId) ? oldAccounts.find((x) => x.id === baseId) : null;

      let res;

      if ('chainId' in old) {
        res = {
          ...mappable,
          type: 'chain',
          accountType: type,
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
          accountType: type,
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
          : // @ts-expect-error Mapping of type which no longer exists.
            `${res.walletId} ${res.accountId} ${res.chainId}`;

      res.id = id;

      if (baseAccountId) {
        // @ts-expect-error Mapping of type which no longer exists.
        res.baseAccountId = baseAccountId;
      }

      return res;
    })
    .filter(nonNullable);

  await t.table('accounts2').bulkPut(newAccounts);
}
