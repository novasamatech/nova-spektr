import { type Transaction } from 'dexie';
import { uniqBy } from 'lodash';

import {
  type PolkadotVaultWallet,
  type SingleShardWallet,
  type VaultBaseAccount,
  type VaultChainAccount,
  type Wallet,
  AccountType,
  SigningType,
  WalletType,
} from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
// eslint-disable-next-line boundaries/element-types
import { type AnyAccount, type AnyAccountDraft, type ChainAccount } from '@/domains/network';

type OldChainAccount = VaultChainAccount & { baseAccountId?: AccountId };
type OldVaultAccount = VaultBaseAccount | OldChainAccount;

type WalletDraft<T = Wallet> = Omit<T, 'id' | 'accounts'>;

type AccountDraft<T extends AnyAccount> = Omit<AnyAccountDraft<T>, 'walletId'>;

/**
 * Convert all Multishard wallets to PolkadotVault or SingleShard wallets
 *
 * @param t Transactions from DB
 *
 * @returns {Promise}
 */
export async function migrateMultishardAccounts(t: Transaction): Promise<void> {
  const { toWallet, toRegroup, toUpdate, toDelete } = await getWalletsAndAccounts(t);

  await updateWallets(t);
  await t.table('accounts2').bulkDelete(toDelete);
  await t.table('accounts2').bulkPut(toUpdate);

  const toWalletValues = Array.from(toWallet.values());
  const walletIds = await t.table('wallets').bulkAdd(toWalletValues, { allKeys: true });

  const walletIdsMap = new Map(toWalletValues.map((w, i) => [w.rootAccountId, walletIds[i]]));

  const newAccounts = Array.from(toRegroup).map(([baseAccountId, accounts]) => {
    const walletId = walletIdsMap.get(baseAccountId);
    if (!walletId) return [];

    if (Array.isArray(accounts)) {
      return accounts.map((a) => {
        return { ...a, walletId, id: `${walletId} ${a.accountId} ${a.chainId}` } satisfies ChainAccount;
      });
    }

    return [{ ...accounts, walletId, id: `${walletId} ${accounts.accountId} universal` } satisfies VaultBaseAccount];
  });

  await t.table('accounts2').bulkAdd(newAccounts.flat());
}

async function updateWallets(t: Transaction) {
  const wallets = await t.table<Wallet>('wallets').toArray();

  const toUpdate: WalletDraft[] = [];
  const toDelete: number[] = [];

  for (const wallet of wallets) {
    // Always remove accounts if they exist
    const { accounts: _, ...cleanWallet } = wallet;

    // @ts-expect-error old types
    if (wallet.type !== 'wallet_mps') {
      toUpdate.push(cleanWallet satisfies WalletDraft);
    } else if ('rootAccountId' in wallet) {
      toUpdate.push({
        ...cleanWallet,
        type: WalletType.POLKADOT_VAULT,
      } satisfies WalletDraft);
    } else {
      toDelete.push(wallet.id);
    }
  }

  await t.table('wallets').bulkDelete(toDelete);
  await t.table('wallets').bulkPut(toUpdate);
}

async function getWalletsAndAccounts(t: Transaction) {
  const accounts = await t.table<AnyAccount>('accounts2').toArray();
  const wallets = await t.table<Wallet>('wallets').toArray();

  const walletsMap = new Map(
    wallets
      // @ts-expect-error old types
      .filter((w) => w.type === 'wallet_mps')
      .map((w) => [w.id, w as PolkadotVaultWallet]),
  );

  // Drafts that require more details to become PV or SS
  const toWalletDraft = new Map<AccountId, VaultBaseAccount>();
  // Will become new wallets
  const toWallet = new Map<AccountId, WalletDraft<PolkadotVaultWallet | SingleShardWallet>>();

  // Draft that require more details to become BaseAccount or ChainAccount
  const toRegroupDraft = new Map<AccountId, OldChainAccount[]>();
  // Will be become BaseAccount or ChainAccount
  const toRegroup = new Map<AccountId, AccountDraft<VaultBaseAccount> | AccountDraft<ChainAccount>[]>();

  // Delete "baseAccountId"
  const toUpdate: ChainAccount[] = [];
  // Empty derivation path
  const toDelete: string[] = [];

  for (const account of accounts) {
    const wallet = walletsMap.get(account.walletId);
    if (!wallet) continue;

    const typedAccount = account as OldVaultAccount;

    if (typedAccount.type === 'universal') {
      toDelete.push(typedAccount.id);
      if (toWalletDraft.has(typedAccount.accountId)) continue;

      toWalletDraft.set(typedAccount.accountId, {
        ...typedAccount,
        name: `${wallet.name} - ${typedAccount.name}`,
      });

      // Vault Chain account:
    } else if (typedAccount.baseAccountId === wallet.rootAccountId) {
      delete typedAccount.baseAccountId;
      toUpdate.push(typedAccount);

      // Multishard Chain account:
    } else {
      toDelete.push(typedAccount.id);

      const regroup = toRegroupDraft.get(typedAccount.baseAccountId!) || [];
      toRegroupDraft.set(typedAccount.baseAccountId!, regroup.concat(typedAccount));
      delete typedAccount.baseAccountId;
    }
  }

  for (const [accountId, accounts] of toRegroupDraft.entries()) {
    const baseAccounts: VaultChainAccount[] = [];
    const chainAccounts: VaultChainAccount[] = [];

    for (const account of uniqBy(accounts, 'accountId')) {
      const array = account.derivationPath ? chainAccounts : baseAccounts;
      array.push(account);
    }

    if (chainAccounts.length) {
      toRegroup.set(accountId, chainAccounts);
    } else {
      toRegroup.set(accountId, {
        name: baseAccounts[0].name ?? 'Base Account',
        accountId: baseAccounts[0].accountId,
        cryptoType: baseAccounts[0].cryptoType,
        type: 'universal',
        accountType: AccountType.BASE,
        signingType: SigningType.POLKADOT_VAULT,
      } satisfies AccountDraft<VaultBaseAccount>);
    }
  }

  for (const [accountId, account] of toWalletDraft.entries()) {
    // Polkadot Vault
    if (Array.isArray(toRegroup.get(accountId))) {
      toWallet.set(accountId, {
        name: account.name ?? 'Polkadot Vault',
        type: WalletType.POLKADOT_VAULT,
        rootAccountId: account.accountId,
      } satisfies WalletDraft<PolkadotVaultWallet>);

      // Singleshard
    } else {
      toWallet.set(accountId, {
        name: account.name ?? 'Polkadot Singleshard',
        type: WalletType.SINGLE_PARITY_SIGNER,
        rootAccountId: account.accountId,
      } satisfies WalletDraft<SingleShardWallet>);
    }
  }

  return {
    toWallet,
    toDelete,
    toUpdate,
    toRegroup,
  };
}
