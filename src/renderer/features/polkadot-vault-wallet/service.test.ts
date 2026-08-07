import { afterEach, describe, expect, it } from 'vitest';

import {
  type MultisigAccount,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  AccountType,
  CryptoType,
  KeyType,
  SigningType,
} from '@/shared/core';
import { createAccountId, kusamaChain, kusamaChainId, polkadotChain, polkadotChainId } from '@/shared/mocks';
import { accountService } from '@/domains/network';
import { networkUtils } from '@/entities/network';

import { polkadotVaultService } from './service';

const signerAccountId = createAccountId('signer');
const otherSignatoryAccountId = createAccountId('other-signatory');

const baseAccount: VaultBaseAccount = {
  id: 'base',
  type: 'universal',
  accountType: AccountType.BASE,
  accountId: createAccountId('root'),
  name: 'root',
  walletId: 1,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
};

// A key derived under Kusama in the user's key set.
const kusamaKey: VaultChainAccount = {
  id: 'kusama-key',
  type: 'chain',
  accountType: AccountType.CHAIN,
  accountId: signerAccountId,
  chainId: kusamaChainId,
  name: 'My key',
  walletId: 1,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  keyType: KeyType.MAIN,
  derivationPath: '//kusama',
  createdAt: 0,
};

const kusamaShard: VaultShardAccount = {
  id: 'kusama-shard',
  type: 'chain',
  accountType: AccountType.SHARD,
  accountId: createAccountId('shard'),
  chainId: kusamaChainId,
  name: 'shard',
  walletId: 1,
  groupId: 'group',
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  keyType: KeyType.CUSTOM,
  derivationPath: '//kusama//0',
  createdAt: 0,
};

// A multisig the user is a signatory of. Multisig accounts are universal, so the
// account graph places them on every multisig-capable chain.
const multisig: MultisigAccount = {
  id: 'multisig',
  type: 'universal',
  accountType: AccountType.MULTISIG,
  accountId: createAccountId('multisig'),
  name: 'Team multisig',
  walletId: 2,
  signingType: SigningType.MULTISIG,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
  threshold: 2,
  signatories: [{ accountId: signerAccountId }, { accountId: otherSignatoryAccountId }],
};

describe('polkadotVaultService.createDraftAccount', () => {
  const chains = { [polkadotChainId]: polkadotChain, [kusamaChainId]: kusamaChain };

  it('builds a universal key when the draft is not scoped to a network', () => {
    const account = polkadotVaultService.createDraftAccount({ chainId: null, derivationPath: '//main' }, chains);

    expect(account).toMatchObject({
      type: 'universal',
      accountType: AccountType.UNIVERSAL_KEY,
      cryptoType: CryptoType.SR25519,
      derivationPath: '//main',
    });
    expect('chainId' in account).toBe(false);
  });

  it('keeps a chain key scoped when the user picked a network', () => {
    const account = polkadotVaultService.createDraftAccount(
      { chainId: kusamaChainId, derivationPath: '//kusama' },
      chains,
    );

    expect(account).toMatchObject({
      type: 'chain',
      accountType: AccountType.CHAIN,
      chainId: kusamaChainId,
    });
  });

  it('builds a shard when the draft carries a group', () => {
    const account = polkadotVaultService.createDraftAccount(
      { chainId: kusamaChainId, derivationPath: '//kusama//0', groupId: 'group' },
      chains,
    );

    expect(account).toMatchObject({ accountType: AccountType.SHARD, groupId: 'group' });
  });

  it('makes the universal key usable on any network', () => {
    const account = polkadotVaultService.createDraftAccount({ chainId: null, derivationPath: '//main' }, chains);

    // The draft has no accountId yet; availability only reads the account type.
    expect(polkadotVaultService.isAvailableOnChain(account as never)).toBe(true);
  });
});

describe('polkadotVaultService.isAvailableOnChain', () => {
  it('keeps the base account available on every chain', () => {
    expect(polkadotVaultService.isAvailableOnChain(baseAccount)).toEqual(true);
  });

  it('makes a derived key available on a network it was not derived under', () => {
    expect(polkadotVaultService.isAvailableOnChain(kusamaKey)).toEqual(true);
  });

  it('makes a shard available on a network it was not derived under', () => {
    expect(polkadotVaultService.isAvailableOnChain(kusamaShard)).toEqual(true);
  });

  it('leaves accounts of other wallet types to their own rule', () => {
    expect(polkadotVaultService.isAvailableOnChain(multisig)).toEqual(false);
  });
});

/**
 * Regression for the reported bug: a multisig signatory backed by a Vault key
 * derived under another network was replaced in the account graph by a virtual
 * signatory placeholder (same address, same resolved name, no signing
 * permission), so the app claimed the user held no key for the multisig.
 */
describe('vault keys as multisig signatories', () => {
  afterEach(() => {
    accountService.accountAvailabilityOnChainAnyOf.resetHandlers();
    accountService.accountActionPermissionAnyOf.resetHandlers();
    accountService.accountCollectChildrenPipeline.resetHandlers();
  });

  const registerRules = () => {
    accountService.accountAvailabilityOnChainAnyOf.registerHandler({
      body: ({ account, chain }) => {
        if (polkadotVaultService.isAvailableOnChain(account)) return true;

        return accountService.isUniversalAccount(account) && networkUtils.isMultisigSupported(chain.options);
      },
      available: () => true,
    });
    accountService.accountActionPermissionAnyOf.registerHandler({
      body: ({ account }) => polkadotVaultService.isAvailableOnChain(account),
      available: () => true,
    });
    // Mirrors the multisig feature: a signatory with no account available on the
    // chain falls back to a permission-less virtual placeholder.
    accountService.accountCollectChildrenPipeline.registerHandler({
      body: (children, { account, accounts }) => {
        if (account !== multisig) return children;

        return multisig.signatories
          .map(
            signatory =>
              accounts.find(a => a.accountId === signatory.accountId) ?? {
                id: signatory.accountId,
                type: 'universal' as const,
                accountType: AccountType.MULTISIG_SIGNATORY,
                accountId: signatory.accountId,
                name: '',
                walletId: multisig.walletId,
                signingType: SigningType.WATCH_ONLY,
                cryptoType: CryptoType.SR25519,
                createdAt: 0,
              },
          )
          .concat(children);
      },
      available: () => true,
    });
  };

  it('finds the Kusama-derived key as a signatory of a Polkadot multisig', () => {
    registerRules();

    const signatories = accountService.findSignatories(multisig, [multisig, kusamaKey], polkadotChain);

    expect(signatories).toEqual([kusamaKey]);
  });

  it('keeps the multisig alive when its only local signer is a foreign-chain key', () => {
    registerRules();

    const orphaned = accountService.findAccountsWithoutSigners([multisig, kusamaKey], {
      [polkadotChainId]: polkadotChain,
      [kusamaChainId]: kusamaChain,
    });

    expect(orphaned).toEqual([]);
  });
});
