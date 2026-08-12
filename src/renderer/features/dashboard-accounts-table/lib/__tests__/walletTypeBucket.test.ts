import { type Wallet, WalletType } from '@/shared/core';
import { getWalletTypeBucket } from '../walletTypeBucket';

// Predicates only read `wallet.type`; the structural cast keeps the fixtures minimal.
const makeWallet = (type: WalletType): Wallet => ({ type }) as unknown as Wallet;

describe('getWalletTypeBucket', () => {
  it.each([
    [WalletType.POLKADOT_VAULT, 'vault'],
    [WalletType.SINGLE_PARITY_SIGNER, 'vault'],
    [WalletType.MULTISIG, 'multisig'],
    [WalletType.FLEXIBLE_MULTISIG, 'multisig'],
    [WalletType.WATCH_ONLY, 'watchOnly'],
    [WalletType.WALLET_CONNECT, 'walletConnect'],
    [WalletType.NOVA_WALLET, 'walletConnect'],
    [WalletType.PROXIED, 'other'],
  ] as const)('maps %s to %s', (type, bucket) => {
    expect(getWalletTypeBucket(makeWallet(type))).toBe(bucket);
  });

  it('maps a missing wallet to contact', () => {
    expect(getWalletTypeBucket(null)).toBe('contact');
  });
});
