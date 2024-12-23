import { type DraftAccount, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type DdAddressInfoDecoded,
  type DynamicDerivationRequestInfo,
  cryptoTypeToMultisignerIndex,
} from '@/entities/transaction';

export const derivationAddressUtils = {
  createDerivationsRequest,
  createDerivedAccounts,
};

function createDerivationsRequest(
  accounts: DraftAccount<VaultChainAccount | VaultShardAccount>[],
): DynamicDerivationRequestInfo[] {
  return accounts.map((account) => ({
    derivationPath: account.derivationPath,
    genesisHash: account.chainId,
    encryption: account.cryptoType,
  }));
}

function createDerivedAccounts<T extends DraftAccount<VaultShardAccount> | DraftAccount<VaultChainAccount>>(
  derivedKeys: Record<string, DdAddressInfoDecoded>,
  accounts: T[],
): (T & { accountId: AccountId })[] {
  return accounts.map((account) => {
    const derivationPath = `${account.derivationPath}${cryptoTypeToMultisignerIndex(account.cryptoType)}`;

    return { ...account, accountId: toAccountId(derivedKeys[derivationPath].publicKey.public) };
  });
}
