import { Dictionary } from 'lodash';

import { ChainAccount, ShardAccount } from '@renderer/shared/core/types/account';
import { DdAddressInfoDecoded, DynamicDerivationRequestInfo } from '@renderer/components/common/QrCode/common/types';
import { toAccountId } from '@renderer/shared/lib/utils';

export type DerivationsAccounts = Omit<ShardAccount | ChainAccount, 'accountId' | 'walletId' | 'id'>;

export const derivationAddressUtils = {
  createDerivationsRequest,
  createDerivedAccounts,
};

function createDerivationsRequest(accounts: DerivationsAccounts[]): DynamicDerivationRequestInfo[] {
  return accounts.map((account) => ({
    derivationPath: account.derivationPath,
    genesisHash: account.chainId,
    encryption: account.cryptoType,
  }));
}

function createDerivedAccounts(
  derivedKeys: Dictionary<DdAddressInfoDecoded>,
  accounts: DerivationsAccounts[],
): Omit<ChainAccount | ShardAccount, 'walletId' | 'id'>[] {
  return accounts.map((account) => {
    return {
      ...account,
      accountId: toAccountId(derivedKeys[account.derivationPath + account.cryptoType].publicKey.public),
    };
  });
}
