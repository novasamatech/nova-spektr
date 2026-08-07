import {
  type ChainId,
  type DraftAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type VaultUniversalKeyAccount,
} from '@/shared/core';
import { RelayChains, toAccountId } from '@/shared/lib/utils';
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

type DerivedDraftAccount = DraftAccount<VaultChainAccount | VaultShardAccount | VaultUniversalKeyAccount>;

/**
 * The genesis hash tells the Vault device which network's key set to file the
 * new key under; it has no effect on the returned public key, which depends
 * only on the derivation path and the encryption. A key with no network scope
 * is therefore requested under Polkadot relay — the network every Vault key set
 * ships with — and is then usable everywhere in the app.
 */
function createDerivationsRequest(accounts: DerivedDraftAccount[]): DynamicDerivationRequestInfo[] {
  return accounts.map((account) => {
    const genesisHash: ChainId = 'chainId' in account ? (account.chainId as ChainId) : RelayChains.POLKADOT;

    return {
      derivationPath: account.derivationPath,
      genesisHash,
      encryption: account.cryptoType,
    };
  });
}

function createDerivedAccounts<T extends DerivedDraftAccount>(
  derivedKeys: Record<string, DdAddressInfoDecoded>,
  accounts: T[],
): (T & { accountId: AccountId })[] {
  return accounts.map((account) => {
    const derivationPath = `${account.derivationPath}${cryptoTypeToMultisignerIndex(account.cryptoType)}`;
    const derivedKey = derivedKeys[derivationPath];

    return {
      ...account,
      accountId: toAccountId(derivedKey?.publicKey.public ?? ''),
      publicKey: derivedKey?.publicKey.publicHex,
    };
  });
}
