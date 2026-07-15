import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type MultisigAccount, type Wallet } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';

import { OperationSignatories } from './OperationSignatories';

const stores = vi.hoisted(() => ({
  walletsStore: Symbol('wallets'),
  accountsStore: Symbol('accounts'),
}));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => {
    if (store === stores.walletsStore) return testWallets;
    if (store === stores.accountsStore) return testAccounts;
    return undefined;
  },
}));

vi.mock('@/shared/di', () => ({
  createSlot: () => Symbol('slot'),
  Slot: ({ props }: { props?: { trigger?: ReactNode } }) => props?.trigger ?? null,
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      if (key === 'operation.signatoriesTitle') return 'Signatories';
      if (key === 'operation.logButton') return 'Log';
      if (key === 'operation.openOverviewButton') return 'Open overview';
      return key;
    },
  }),
}));

vi.mock('@/shared/lib/utils', () => ({
  cnTw: (...classNames: unknown[]) => classNames.filter(Boolean).join(' '),
  nonNullable: <T,>(value: T | null | undefined): value is T => value !== null && value !== undefined,
  toAddress: (accountId: AccountId) => accountId,
}));

vi.mock('@/shared/ui', () => ({
  CountChip: ({ count }: { count: number }) => <span>{count}</span>,
  FootnoteText: ({ children }: { children: ReactNode }) => <h4>{children}</h4>,
  IconButton: () => <button type="button" />,
  SmallTitleText: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/shared/ui-kit', () => ({
  Copy: ({ value, children }: { value: string; children: ReactNode }) => (
    <span data-testid="copy" data-value={value}>
      {children}
    </span>
  ),
  Tooltip: Object.assign(({ children }: { children: ReactNode }) => children, {
    Trigger: ({ children }: { children: ReactNode }) => children,
    Content: ({ children }: { children: ReactNode }) => children,
  }),
}));

vi.mock('@/shared/ui-entities', () => ({
  Address: ({ title, address }: { title?: string; address: string }) => <span>{title ?? address}</span>,
}));

vi.mock('@/domains/network', () => ({
  accounts: { $list: stores.accountsStore },
  isContactMultisigAccount: () => false,
  multisigOperationService: {
    getApprovals: () => [],
  },
  useAccountName: ({ accountId }: { accountId: AccountId }) => accountId,
}));

vi.mock('@/entities/network', () => ({
  useChain: () => ({ chainId: '0x00', addressPrefix: 0 }),
}));

vi.mock('@/entities/operations', () => ({
  operationDetailsUtils: {
    getSignatoryStatus: () => 'pending',
  },
}));

vi.mock('@/entities/signatory', () => ({
  SignatoryCard: ({ children }: { children: ReactNode }) => <li>{children}</li>,
}));

vi.mock('@/entities/wallet', () => ({
  accountUtils: {
    isFlexibleMultisigAccount: () => false,
  },
  walletModel: { $wallets: stores.walletsStore },
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ title, accountId }: { title?: string; accountId: AccountId }) => <span>{title ?? accountId}</span>,
}));

vi.mock('./OperationLog', () => ({
  OperationLog: () => null,
}));

vi.mock('./NotifySignersButton', () => ({ NotifySignersButton: () => null }));

const ownedSignatoryId = '0x01' as AccountId;
const contactSignatoryId = '0x02' as AccountId;
const signerWalletId = 1;

const testWallets = [
  {
    id: signerWalletId,
    name: 'Signer Wallet',
    accounts: [],
    type: 'polkadot_vault',
  },
] as unknown as Wallet[];

const testAccounts = [
  {
    id: 'owned-signatory',
    name: 'Alice Signer',
    walletId: signerWalletId,
    accountId: ownedSignatoryId,
  },
] as unknown as AnyAccount[];

const operation = {
  id: 'operation-id',
  chainId: '0x00',
  events: [],
  transaction: null,
} as unknown as MultisigOperation;

const multisigAccount = {
  id: 'multisig',
  accountId: '0x03',
  walletId: 2,
  signatories: [{ accountId: ownedSignatoryId }, { accountId: contactSignatoryId }],
} as unknown as MultisigAccount;

describe('OperationSignatories', () => {
  it('renders owned signatories as accounts instead of wallets', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    expect(screen.getByText('Alice Signer')).toBeInTheDocument();
    expect(screen.queryByText('Signer Wallet')).not.toBeInTheDocument();
  });

  it('renders a flat signatory list without group headers', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    expect(screen.queryByText('Your accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    expect(screen.getByText('Alice Signer')).toBeInTheDocument();
    expect(screen.getByText(contactSignatoryId)).toBeInTheDocument();
  });

  it('passes the deep link to the share button', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    expect(screen.getByTestId('copy')).toHaveAttribute('data-value', 'https://example.com');
  });
});
