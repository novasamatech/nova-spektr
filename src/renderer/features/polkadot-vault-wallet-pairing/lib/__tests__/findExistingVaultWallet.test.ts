import { type Wallet, WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { findExistingVaultWallet } from '../findExistingVaultWallet';

const ROOT = '0x01' as AccountId;
const DERIVED = '0x02' as AccountId;
const OTHER = '0x03' as AccountId;

const wallet = (overrides: Partial<Wallet> & Record<string, unknown>): Wallet =>
  ({ id: 1, name: 'Wallet', isActive: false, signingType: 'signing_ps', accounts: [], ...overrides }) as Wallet;

describe('features/polkadot-vault-wallet-pairing/lib/findExistingVaultWallet', () => {
  test('matches singleshard by its single account id', () => {
    const existing = wallet({
      type: WalletType.SINGLE_PARITY_SIGNER,
      accounts: [{ accountId: ROOT } as Wallet['accounts'][number]],
    });

    expect(findExistingVaultWallet([existing], ROOT)).toBe(existing);
  });

  test('matches vault by root key even when no account carries it', () => {
    const existing = wallet({
      type: WalletType.POLKADOT_VAULT,
      rootAccountId: ROOT,
      accounts: [{ accountId: DERIVED } as Wallet['accounts'][number]],
    });

    expect(findExistingVaultWallet([existing], ROOT)).toBe(existing);
  });

  test('ignores other wallet types with the same account id', () => {
    const watchOnly = wallet({
      type: WalletType.WATCH_ONLY,
      accounts: [{ accountId: ROOT } as Wallet['accounts'][number]],
    });

    expect(findExistingVaultWallet([watchOnly], ROOT)).toBeNull();
  });

  test('returns null when nothing matches', () => {
    const existing = wallet({ type: WalletType.POLKADOT_VAULT, rootAccountId: OTHER });

    expect(findExistingVaultWallet([existing], ROOT)).toBeNull();
    expect(findExistingVaultWallet([existing], null)).toBeNull();
  });
});
