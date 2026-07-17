import { BN } from '@polkadot/util';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AssetId, type Balance, type Wallet, AssetType, CryptoType, SigningType, WalletType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type BalanceUpdateResult } from '@/domains/network';

import { type TransactionValidationBalanceError, TransactionValidationError } from './TransactionValidationError';

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/api/xcm/service/xcm-error-utils', () => ({
  categorizeXcmError: () => ({ isTooExpensive: false, isFeesNotMet: false }),
  getHumanReadableXcmError: () => undefined,
}));

vi.mock('@/domains/network', async importOriginal => ({
  ...(await importOriginal<object>()),
  useWalletName: (wallet: Wallet) => wallet.name,
  useAccountsNames: (accounts: AnyAccount[]) => accounts,
}));

const makeKey = (id: string, accountId: string): AnyAccount => ({
  id,
  walletId: 1,
  name: `key ${id}`,
  type: 'chain',
  accountId: accountId as AccountId,
  chainId: '0x00',
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
  });

  it('keeps wallet-level wording for a single-account wallet', () => {
    render(<TransactionValidationError errors={[makeError(keyA)]} wallets={[makeWallet([keyA])]} />);

    expect(screen.getByText('general.transactionErrors.balance.intro')).toBeInTheDocument();
    expect(screen.queryByText('general.transactionErrors.balance.introAccount')).not.toBeInTheDocument();
  });
});
