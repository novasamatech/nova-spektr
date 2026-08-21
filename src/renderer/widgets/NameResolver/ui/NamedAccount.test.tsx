import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Wallet, WalletType } from '@/shared/core';
import { createAccountId, polkadotChain } from '@/shared/mocks';

import { NamedAccount } from './NamedAccount';

const useAccountName = vi.fn((_params: unknown) => 'resolved');

vi.mock('@/domains/network', () => ({
  useAccountName: (params: unknown) => useAccountName(params),
  // Mirrors the real hook: no wallet, no name.
  useWalletName: (wallet: unknown) => (wallet ? 'Wallet Name' : null),
}));

vi.mock('@/shared/ui-entities/Account/Account', () => ({
  Account: ({ title }: { title?: string }) => <div data-testid="account">{title}</div>,
}));

const accountId = createAccountId('named-account');

const wallet: Wallet = {
  id: 1,
  name: 'Raw Wallet Name',
  type: WalletType.WATCH_ONLY,
  accounts: [],
};

const getNameParams = () => useAccountName.mock.calls.at(-1)?.[0];

describe('widgets/NameResolver/NamedAccount', () => {
  beforeEach(() => {
    useAccountName.mockClear();
  });

  it('should resolve without a title or a fallback when no wallet is passed', () => {
    render(<NamedAccount accountId={accountId} chain={polkadotChain} />);

    expect(screen.getByTestId('account')).toHaveTextContent('resolved');
    expect(getNameParams()).toMatchObject({ accountId, title: undefined, fallbackName: undefined });
  });

  it('should pass the wallet name as title in the default override mode', () => {
    render(<NamedAccount accountId={accountId} chain={polkadotChain} wallet={wallet} />);

    expect(getNameParams()).toMatchObject({ title: 'Wallet Name', fallbackName: undefined });
  });

  it('should pass the wallet name as a fallback in fallback mode', () => {
    render(<NamedAccount accountId={accountId} chain={polkadotChain} wallet={wallet} walletNameAs="fallback" />);

    expect(getNameParams()).toMatchObject({ title: undefined, fallbackName: 'Wallet Name' });
  });

  it('should let an explicit title win over the wallet name in override mode', () => {
    render(<NamedAccount accountId={accountId} chain={polkadotChain} wallet={wallet} title="Explicit" />);

    expect(getNameParams()).toMatchObject({ title: 'Explicit', fallbackName: undefined });
  });

  it('should let an explicit title win in fallback mode, keeping the wallet name as the fallback', () => {
    render(
      <NamedAccount
        accountId={accountId}
        chain={polkadotChain}
        wallet={wallet}
        walletNameAs="fallback"
        title="Explicit"
      />,
    );

    expect(getNameParams()).toMatchObject({ title: 'Explicit', fallbackName: 'Wallet Name' });
  });
});
