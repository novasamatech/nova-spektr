import { Dictionary } from 'lodash';

import type { ChainAccount, ShardAccount, DraftAccount } from '@shared/core';
import { DdAddressInfoDecoded, DynamicDerivationRequestInfo } from '@renderer/components/common/QrCode/common/types';
import { cryptoTypeToMultisignerIndex } from '@renderer/components/common/QrCode/QrGenerator/common/utils';
import { toAccountId } from '@renderer/shared/lib/utils';

export const derivationAddressUtils = {
  createDerivationsRequest,
  createDerivedAccounts,
};

function createDerivationsRequest(
  accounts: DraftAccount<ShardAccount | ChainAccount>[],
): DynamicDerivationRequestInfo[] {
  return accounts.map((account) => ({
    derivationPath: account.derivationPath,
    genesisHash: account.chainId,
    encryption: account.cryptoType,
  }));
}

function createDerivedAccounts(
  derivedKeys: Dictionary<DdAddressInfoDecoded>,
  accounts: DraftAccount<ShardAccount | ChainAccount>[],
): Omit<ChainAccount | ShardAccount, 'walletId' | 'id'>[] {
  return accounts.map((account) => {
    const derivationPath = `${account.derivationPath}${cryptoTypeToMultisignerIndex(account.cryptoType)}`;

    return { ...account, accountId: toAccountId(derivedKeys[derivationPath].publicKey.public) };
  });
}
