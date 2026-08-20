import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type MultisigAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type AnyAccount, type MultisigOperation } from '@/domains/network';

import { OperationSignatories } from './OperationSignatories';

const stores = vi.hoisted(() => ({
  accountsStore: Symbol('accounts'),
}));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => {
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
}));

vi.mock('@/shared/ui', () => ({
  CountChip: ({ count }: { count: number }) => <span>{count}</span>,
  FootnoteText: ({ children, as: Component = 'h4' }: { children: ReactNode; as?: keyof HTMLElementTagNameMap }) => (
    <Component>{children}</Component>
  ),
  IconButton: () => <button type="button" />,
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

vi.mock('@/domains/network', () => ({
  accounts: { $list: stores.accountsStore },
  isContactMultisigAccount: () => false,
  multisigOperationService: {
    getApprovals: () => [],
  },
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
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ title, accountId, wallet }: { title?: string; accountId: AccountId; wallet?: unknown }) => (
    <span data-title={title} data-wallet={wallet ? 'yes' : undefined}>
      {title ?? accountId}
    </span>
  ),
}));

vi.mock('./OperationLog', () => ({
  OperationLog: () => null,
}));

vi.mock('./NotifySignersButton', () => ({ NotifySignersButton: () => null }));

const ownedSignatoryId = '0x01' as AccountId;
const contactSignatoryId = '0x02' as AccountId;

const testAccounts: AnyAccount[] = [];

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
  it('resolves every signatory through NamedAccount without wallet or raw-name overrides', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    const owned = screen.getByText(ownedSignatoryId);
    expect(owned).not.toHaveAttribute('data-title');
    expect(owned).not.toHaveAttribute('data-wallet');
    expect(screen.queryByText('Signer Wallet')).not.toBeInTheDocument();
    expect(screen.queryByText('Alice Signer')).not.toBeInTheDocument();
  });

  it('exposes the tab pair as an accessible group with pressed state', async () => {
    const user = userEvent.setup();
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    const [signatoriesTab, logTab] = screen.getAllByRole('button', { name: /Signatories|Log/ });
    expect(signatoriesTab).toHaveAttribute('aria-pressed', 'true');
    expect(logTab).toHaveAttribute('aria-pressed', 'false');

    if (!logTab) throw new Error('log tab missing');
    await user.click(logTab);

    expect(signatoriesTab).toHaveAttribute('aria-pressed', 'false');
    expect(logTab).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders a flat signatory list without group headers', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    expect(screen.queryByText('Your accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('Contacts')).not.toBeInTheDocument();
    expect(screen.getByText(ownedSignatoryId)).toBeInTheDocument();
    expect(screen.getByText(contactSignatoryId)).toBeInTheDocument();
  });

  it('passes the deep link to the share button', () => {
    render(<OperationSignatories operation={operation} account={multisigAccount} deepLink="https://example.com" />);

    expect(screen.getByTestId('copy')).toHaveAttribute('data-value', 'https://example.com');
  });
});
