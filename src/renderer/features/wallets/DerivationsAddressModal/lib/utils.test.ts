import { describe, expect, it } from 'vitest';

import { type VaultChainAccount, AccountType, CryptoType, KeyType, SigningType } from '@/shared/core';
import { RelayChains } from '@/shared/lib/utils';
import { kusamaChainId } from '@/shared/mocks';
import { type VaultDraftAccount } from '@/features/polkadot-vault-wallet';

import { derivationAddressUtils } from './utils';

const common = {
  name: 'key',
  keyType: KeyType.CUSTOM,
  signingType: SigningType.POLKADOT_VAULT,
  cryptoType: CryptoType.SR25519,
  createdAt: 0,
};

const universalKey: VaultDraftAccount = {
  ...common,
  type: 'universal',
  accountType: AccountType.UNIVERSAL_KEY,
  derivationPath: '//main',
};

const kusamaKey: VaultDraftAccount = {
  ...common,
  type: 'chain',
  accountType: AccountType.CHAIN,
  chainId: kusamaChainId,
  derivationPath: '//kusama',
} as VaultChainAccount;

describe('createDerivationsRequest', () => {
  it('anchors a key with no network scope to Polkadot relay', () => {
    const [request] = derivationAddressUtils.createDerivationsRequest([universalKey]);

    expect(request).toEqual({
      derivationPath: '//main',
      genesisHash: RelayChains.POLKADOT,
      encryption: CryptoType.SR25519,
    });
  });

  it('keeps the chosen network for a scoped key', () => {
    const [request] = derivationAddressUtils.createDerivationsRequest([kusamaKey]);

    expect(request?.genesisHash).toEqual(kusamaChainId);
  });
});

describe('createDerivedAccounts', () => {
  it('fills the public key of a universal key from the device response', () => {
    // The device indexes its answer by derivation path and encryption only —
    // the genesis hash the key was requested under does not change the key.
    const derivedKeys = {
      '//main1': {
        derivationPath: '//main1',
        encryption: CryptoType.SR25519,
        publicKey: {
          public: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
          publicHex: '0x1a',
        },
      },
    };

    const [account] = derivationAddressUtils.createDerivedAccounts(derivedKeys as never, [universalKey]);

    expect(account?.accountId).toBeTruthy();
    expect(account).toMatchObject({ accountType: AccountType.UNIVERSAL_KEY, publicKey: '0x1a' });
  });
});
