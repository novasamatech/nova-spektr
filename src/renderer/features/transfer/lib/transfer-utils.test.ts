import { describe, expect, it } from 'vitest';

import { type WatchOnlyAccount, AccountType, CryptoType, SigningType } from '@/shared/core';
import { toAddress } from '@/shared/lib/utils';
import {
  createAccountId,
  createProxiedAccount,
  createVaultChainAccount,
  kusamaChainId,
  mythosChain,
  polkadotAssetHubChain,
  polkadotChain,
  polkadotChainId,
} from '@/shared/mocks';

import { transferUtils } from './transfer-utils';

const walletId = 1;

// Key-set vault wallet: chain-scoped derived keys only, no universal account
const polkadotKey = createVaultChainAccount('dot-key', {
  walletId,
  chainId: polkadotChainId,
  derivationPath: '//polkadot',
  name: 'Polkadot Key',
});
const kusamaKey = createVaultChainAccount('ksm-key', {
  walletId,
  chainId: kusamaChainId,
  derivationPath: '//kusama',
  name: 'Kusama Key',
});

describe('features/transfer/lib/transfer-utils#filterRecipientAccounts', () => {
  it('should keep chain-scoped keys of other chains — any scheme-compatible account can receive', () => {
    const result = transferUtils.filterRecipientAccounts({
      accounts: [polkadotKey, kusamaKey],
      chain: polkadotAssetHubChain,
      query: '',
    });

    expect(result).toEqual([polkadotKey, kusamaKey]);
  });

  it('should exclude the initiator account', () => {
    const result = transferUtils.filterRecipientAccounts({
      accounts: [polkadotKey, kusamaKey],
      chain: polkadotChain,
      query: '',
      initiator: polkadotKey,
    });

    expect(result).toEqual([kusamaKey]);
  });

  it('should exclude accounts with a mismatched address scheme', () => {
    const result = transferUtils.filterRecipientAccounts({
      accounts: [polkadotKey, kusamaKey],
      chain: mythosChain,
      query: '',
    });

    expect(result).toEqual([]);
  });

  it('should never offer keyless chain-local accounts through the scheme-match path', () => {
    // Proxied (incl. pure proxy) and multisig accounts exist only where their
    // pallets/relationships do — they must pass the strict availability rule
    // (DI handlers), not the keyed-account scheme match. Without registered
    // availability handlers they are always excluded.
    const proxiedAccount = createProxiedAccount('proxied', walletId);

    const result = transferUtils.filterRecipientAccounts({
      accounts: [proxiedAccount, kusamaKey],
      chain: polkadotAssetHubChain,
      query: '',
    });

    expect(result).toEqual([kusamaKey]);
  });

  it('should never offer watch-only accounts through the scheme-match path', () => {
    // The user doesn't hold the key of a watch-only account, so the transfer
    // feature can't assume the address is receivable on a scheme-compatible
    // chain — the watch-only wallet feature's availability rule (DI handler)
    // decides. Without registered handlers it is always excluded.
    const watchOnlyAccount: WatchOnlyAccount = {
      id: `${walletId} watch-only universal`,
      type: 'universal',
      accountType: AccountType.WATCH_ONLY,
      accountId: createAccountId('watch-only'),
      walletId,
      name: 'Watch Only',
      cryptoType: CryptoType.SR25519,
      signingType: SigningType.WATCH_ONLY,
      createdAt: Date.now(),
    };

    const result = transferUtils.filterRecipientAccounts({
      accounts: [watchOnlyAccount, kusamaKey],
      chain: polkadotAssetHubChain,
      query: '',
    });

    expect(result).toEqual([kusamaKey]);
  });

  it('should filter by name or address query', () => {
    const byName = transferUtils.filterRecipientAccounts({
      accounts: [polkadotKey, kusamaKey],
      chain: polkadotChain,
      query: 'kusama',
    });
    expect(byName).toEqual([kusamaKey]);

    const address = toAddress(polkadotKey.accountId, { prefix: polkadotChain.addressPrefix });
    const byAddress = transferUtils.filterRecipientAccounts({
      accounts: [polkadotKey, kusamaKey],
      chain: polkadotChain,
      query: address.slice(0, 8),
    });
    expect(byAddress).toEqual([polkadotKey]);
  });
});
