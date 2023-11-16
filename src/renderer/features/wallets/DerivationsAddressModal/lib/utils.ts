import { ChainAccount, ShardedAccountWithShards } from '@renderer/shared/core/types/account';
import { DdAddressInfoDecoded, DynamicDerivationRequestInfo } from '@renderer/components/common/QrCode/common/types';
import { Dictionary } from "lodash";
import { toAccountId } from "@renderer/shared/lib/utils";
import { accountUtils } from "@renderer/entities/wallet";

export type DerivationsAccounts = Omit<ShardedAccountWithShards | ChainAccount, 'accountId' | 'walletId' | 'id'>;

export const derivationAddressUtils = {
  createDerivationsRequest,
  createDerivedAccounts,
};

function createDerivationsRequest(accounts: DerivationsAccounts[]): DynamicDerivationRequestInfo[] {
  return accounts.reduce<DynamicDerivationRequestInfo[]>((acc, account) => {
    if (accountUtils.isAccountWithShards(account)) {
      acc.push(
        ...(account as ShardedAccountWithShards).shards.map((shard) => ({
          derivationPath: shard.derivationPath,
          genesisHash: account.chainId,
          encryption: shard.cryptoType,
        })),
      );
    } else {
      acc.push({
        derivationPath: (account as ChainAccount).derivationPath,
        genesisHash: account.chainId,
        encryption: (account as ChainAccount).cryptoType,
      });
    }

    return acc;
  }, []);
}

function createDerivedAccounts(
  derivedKeys: Dictionary<DdAddressInfoDecoded>,
  accounts: DerivationsAccounts[],
): Omit<ChainAccount | ShardedAccountWithShards, 'walletId' | 'id'>[] {
  return accounts.map((account) => {
    if (accountUtils.isAccountWithShards(account)) {
      return {
        ...account,
        shards: (account as ShardedAccountWithShards).shards.map((shard) => ({
          ...shard,
        })),
      };
    } else {
      return {
        ...account,
        accountId: toAccountId(
          derivedKeys[(account as ChainAccount).derivationPath + (account as ChainAccount).cryptoType].publicKey
            .public,
        ),
      };
    }
  });
}
