import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Wallet, WalletType } from '@/shared/core';
import { createAccountId, polkadotChain } from '@/shared/mocks';

import { NamedAccount } from './NamedAccount';

const useAccountName = vi.fn((_params: unknown) => 'resolved');

vi.mock('@/domains/network', () => ({
  useAccountName: (params: unknown) => useAccountName(params),
  // Mirrors the real hook: no wallet, no name.
  useWalletName: (wallet: { id: number } | null | undefined) =>
    wallet ? (wallet.id === 2 ? 'Owning Wallet Name' : 'Wallet Name') : null,
}));

vi.mock('@/shared/ui-entities/Account/Account', () => ({
  Account: ({ title, walletType }: { title?: string; walletType?: WalletType }) => (
    <div data-testid="account" data-wallet-type={walletType}>
      {title}
    </div>
  ),
}));

const accountId = createAccountId('named-account');
const ownedAccountId = createAccountId('owned-account');

const wallet: Wallet = {
  id: 1,
  name: 'Raw Wallet Name',
  type: WalletType.WATCH_ONLY,
  accounts: [],
};

const owningWallet: Wallet = {
  id: 2,
  name: 'Raw Owning Wallet Name',
  type: WalletType.POLKADOT_VAULT,
  accounts: [],
};

vi.mock('../lib/useOwningWallet', () => ({
  useOwningWallet: (id: unknown) => (id === ownedAccountId ? owningWallet : null),
}));

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

  it('should look up the owning wallet in fallback mode when no wallet is passed', () => {
    render(<NamedAccount accountId={ownedAccountId} chain={polkadotChain} walletNameAs="fallback" />);

    expect(getNameParams()).toMatchObject({ title: undefined, fallbackName: 'Owning Wallet Name' });
    expect(screen.getByTestId('account')).toHaveAttribute('data-wallet-type', String(WalletType.POLKADOT_VAULT));
  });

  it('should let an explicit wallet win over the owning wallet in fallback mode', () => {
    render(<NamedAccount accountId={ownedAccountId} chain={polkadotChain} wallet={wallet} walletNameAs="fallback" />);

    expect(getNameParams()).toMatchObject({ fallbackName: 'Wallet Name' });
    expect(screen.getByTestId('account')).toHaveAttribute('data-wallet-type', String(WalletType.WATCH_ONLY));
  });

  it('should ignore the owning wallet in override mode when no wallet is passed', () => {
    render(<NamedAccount accountId={ownedAccountId} chain={polkadotChain} />);

    expect(getNameParams()).toMatchObject({ title: undefined, fallbackName: undefined });
    expect(screen.getByTestId('account')).not.toHaveAttribute('data-wallet-type');
  });
});
