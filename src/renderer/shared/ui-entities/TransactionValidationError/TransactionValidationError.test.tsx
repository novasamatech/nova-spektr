import { BN } from '@polkadot/util';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type AssetId, type Balance, type Wallet, AssetType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type BalanceUpdateResult } from '@/domains/network';

import { type TransactionValidationBalanceError, TransactionValidationError } from './TransactionValidationError';

const mocks = vi.hoisted(() => ({
  useAccountsNames: vi.fn((accounts: AnyAccount[]) => accounts),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, components }: { i18nKey: string; components?: Record<string, ReactNode> }) => (
    <span>
      {i18nKey}
      {components?.account}
    </span>
  ),
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('../Account/Account', () => ({
  Account: ({ title }: { title?: string }) => <span>{title}</span>,
}));

vi.mock('@/shared/api/xcm/service/xcm-error-utils', () => ({
  categorizeXcmError: () => ({ isTooExpensive: false, isFeesNotMet: false }),
  getHumanReadableXcmError: () => undefined,
}));

vi.mock('@/domains/network', async importOriginal => ({
  ...(await importOriginal<object>()),
  useWalletName: (wallet: Wallet) => wallet.name,
  useAccountsNames: mocks.useAccountsNames,
}));

const makeKey = (id: string, accountId: string, chainId: `0x${string}` = '0x00'): AnyAccount => ({
  id,
  walletId: 1,
  name: `key ${id}`,
  type: 'chain',
  accountId: accountId as AccountId,
  chainId,
  cryptoType: CryptoType.SR25519,
  signingType: SigningType.POLKADOT_VAULT,
  createdAt: Date.now(),
});

const keyA = makeKey('a', '0x01');
const keyB = makeKey('b', '0x02');

const makeError = (account: AnyAccount): TransactionValidationBalanceError => ({
  account,
  action: 'fee',
  asset: {
    name: 'Polkadot',
    assetId: 0 as AssetId,
    symbol: 'DOT',
    precision: 10,
    icon: { monochrome: '', colored: '' },
    type: AssetType.NATIVE,
  },
  balance: {
    success: false,
    imbalance: new BN(1),
    required: new BN(1),
    burned: new BN(1),
    balance: {} as unknown as Balance,
  } satisfies BalanceUpdateResult,
});

const makeWallet = (accounts: AnyAccount[]): Wallet =>
  ({ id: 1, name: 'PTL Keys', type: WalletType.POLKADOT_VAULT, accounts }) as Wallet;

describe('TransactionValidationError', () => {
  it('names the specific key for a key-set wallet', () => {
    render(<TransactionValidationError errors={[makeError(keyB)]} wallets={[makeWallet([keyA, keyB])]} />);

    expect(screen.getByText('general.transactionErrors.balance.introAccount')).toBeInTheDocument();
    expect(screen.getByText('general.transactionErrors.balance.requiredAccount', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('key b')).toBeInTheDocument();
  });

  it('keeps wallet-level wording for a single-account wallet', () => {
    render(<TransactionValidationError errors={[makeError(keyA)]} wallets={[makeWallet([keyA])]} />);

    expect(screen.getByText('general.transactionErrors.balance.intro')).toBeInTheDocument();
    expect(screen.queryByText('general.transactionErrors.balance.introAccount')).not.toBeInTheDocument();
  });

  it('keeps wallet-level wording when the same key is replicated across chains', () => {
    // Same accountId, two chain-specific rows — this must NOT be treated as a
    // key-set. A regression to `wallet.accounts.length > 1` would flip this.
    const keyA1 = makeKey('a1', '0x01', '0x00');
    const keyA2 = makeKey('a2', '0x01', '0x11');

    render(<TransactionValidationError errors={[makeError(keyA1)]} wallets={[makeWallet([keyA1, keyA2])]} />);

    expect(screen.getByText('general.transactionErrors.balance.intro')).toBeInTheDocument();
    expect(screen.queryByText('general.transactionErrors.balance.introAccount')).not.toBeInTheDocument();
  });

  it('falls back to the short address when the account has no resolved name', () => {
    mocks.useAccountsNames.mockReturnValueOnce([{ ...keyB, name: '' }]);
    const expectedShortAddress = toShortAddress(toAddress(keyB.accountId));

    render(<TransactionValidationError errors={[makeError(keyB)]} wallets={[makeWallet([keyA, keyB])]} />);

    expect(screen.getByText('general.transactionErrors.balance.introAccount')).toBeInTheDocument();
    expect(screen.getByText(expectedShortAddress)).toBeInTheDocument();
    expect(screen.queryByText('key b')).not.toBeInTheDocument();
  });
});
