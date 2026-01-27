import { type Transaction } from 'dexie';

import { type Wallet, ChainType, CryptoType } from '@/shared/core';
import { nonNullable } from '@/shared/lib/utils';
import { pjsSchema } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount } from '@/domains/network';

/**
 * Migrate accounts table to accounts2 for supporting new format
 *
 * @param t Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateAccounts(t: Transaction): Promise<void> {
  const oldAccounts = await t.db.table<AnyAccount>('accounts').toArray();
  const wallets = await t.db.table<Wallet>('wallets').toArray();

  const newAccounts = oldAccounts
    .map<AnyAccount | null>((old) => {
      const wallet = wallets.find((x) => x.id === old.walletId);
      if (!wallet) return null;
      // @ts-expect-error old types
      const { chainType, baseId, type, ...mappable } = old;
      const baseAccountId = nonNullable(baseId) ? oldAccounts.find((x) => x.id === baseId) : null;

      const finalType = wallet.type === 'wallet_wo' ? 'watch_only' : type;
      let res: AnyAccount;

      if ('chainId' in old) {
        res = {
          ...mappable,
          type: 'chain',
          // @ts-expect-error old types
          accountType: finalType,
          accountId: pjsSchema.helpers.toAccountId(old.accountId),
          chainId: old.chainId,
          cryptoType: chainType === ChainType.SUBSTRATE ? CryptoType.SR25519 : CryptoType.ETHEREUM,
          name: old.name,
          // @ts-expect-error field was deleted
          signingType: wallet.signingType,
        };
      } else {
        res = {
          ...mappable,
          type: 'universal',
          // @ts-expect-error old types
          accountType: finalType,
          accountId: pjsSchema.helpers.toAccountId(old.accountId),
          cryptoType: chainType === ChainType.SUBSTRATE ? CryptoType.SR25519 : CryptoType.ETHEREUM,
          name: old.name,
          // @ts-expect-error field was deleted
          signingType: wallet.signingType,
        };
      }

      // clone of accountService.uniqId method.
      const id =
        res.type === 'universal'
          ? `${res.walletId} ${res.accountId} universal`
          : `${res.walletId} ${res.accountId} ${res.chainId}`;

      res.id = id;

      if (baseAccountId) {
        // @ts-expect-error old types
        res.baseAccountId = baseAccountId;
      }

      return res;
    })
    .filter(nonNullable);

  await t.table('accounts2').bulkPut(newAccounts);
}
