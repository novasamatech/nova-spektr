import { type ChainAccount, type DraftAccount, type ShardAccount } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
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
  accounts: DraftAccount<ChainAccount | ShardAccount>[],
): DynamicDerivationRequestInfo[] {
  return accounts.map((account) => ({
    derivationPath: account.derivationPath,
    genesisHash: account.chainId,
    encryption: account.cryptoType,
  }));
}

function createDerivedAccounts(
  derivedKeys: Record<string, DdAddressInfoDecoded>,
  accounts: DraftAccount<ShardAccount | ChainAccount>[],
): DraftAccount<ChainAccount | ShardAccount>[] {
  return accounts.map((account) => {
    const derivationPath = `${account.derivationPath}${cryptoTypeToMultisignerIndex(account.cryptoType)}`;

    return { ...account, accountId: toAccountId(derivedKeys[derivationPath].publicKey.public) };
  });
}
