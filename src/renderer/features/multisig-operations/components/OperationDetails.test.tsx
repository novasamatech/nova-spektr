import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';

import { OperationDetails } from './OperationDetails';

const stores = vi.hoisted(() => ({ chainsStore: Symbol('chains') }));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) =>
    store === stores.chainsStore ? { '0x00': { chainId: '0x00', addressPrefix: 0 } } : undefined,
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatDate: () => '30 Apr 2026, 13:19',
  }),
}));

vi.mock('@/shared/ui', () => ({
  DetailRow: ({ label, children }: { label: string; children: ReactNode }) => (
    <div data-testid={`row-${label}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  ),
  FootnoteText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SmallTitleText: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

vi.mock('@/domains/network', () => ({
  multisigOperationService: { getApprovals: () => [] },
}));

vi.mock('@/entities/network', () => ({
  networkModel: { $chains: stores.chainsStore },
}));

vi.mock('@/entities/transaction', () => ({
  findCoreTransaction: (tx: { section: string; method: string } | null) => tx,
}));

vi.mock('@/entities/wallet', () => ({
  accountUtils: {
    isFlexibleMultisigAccount: (account: { multisigAccountId?: string }) => Boolean(account.multisigAccountId),
  },
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId, title, wallet }: { accountId: AccountId; title?: string; wallet?: unknown }) => (
    <span data-title={title} data-wallet={wallet ? 'yes' : undefined}>
      {accountId}
    </span>
  ),
}));

vi.mock('@/widgets/transaction-amount', () => ({
  OperationAmount: ({ value }: { value: string }) => <span>{value}</span>,
}));

vi.mock('./OperationDescription', () => ({ OperationDescription: () => <div>description</div> }));

const depositor = '0xdepositor' as AccountId;
const multisigId = '0xmultisig' as AccountId;
const proxiedId = '0xproxied' as AccountId;

const baseOperation = {
  id: 'op',
  chainId: '0x00',
  depositor,
  multisigAccountId: multisigId,
  timestamp: 1_777_000_000_000,
  events: [],
  transaction: { section: 'balances', method: 'transferKeepAlive' },
  section: 'balances',
  method: 'transferKeepAlive',
} as unknown as MultisigOperation;

const multisigAccount = { accountId: multisigId, signatories: [] } as unknown as MultisigAccount;
const flexibleAccount = {
  accountId: proxiedId,
  multisigAccountId: multisigId,
  signatories: [],
} as unknown as FlexibleMultisigAccount;

describe('OperationDetails', () => {
  it('renders the depositor as an account without a wallet name override', () => {
    render(<OperationDetails operation={baseOperation} account={multisigAccount} />);

    const row = screen.getByTestId('row-operation.details.depositor');
    expect(row).toHaveTextContent(depositor);
    expect(row.querySelector('[data-title]')).toBeNull();
    expect(row.querySelector('[data-wallet]')).toBeNull();
  });

  it('renders Date & Time first, then Depositor, Multisig, slot content, Operation type', () => {
    render(
      <OperationDetails operation={baseOperation} account={multisigAccount}>
        <div data-testid="row-slot">recipient</div>
      </OperationDetails>,
    );

    const order = screen.getAllByTestId(/^row-/).map(el => el.dataset.testid);
    expect(order).toEqual([
      'row-operation.details.dateTime',
      'row-operation.details.depositor',
      'row-operation.details.multisig',
      'row-slot',
      'row-operation.details.operationType',
    ]);
    expect(screen.getByTestId('row-operation.details.multisig')).toHaveTextContent(multisigId);
    expect(screen.getByTestId('row-operation.details.operationType')).toHaveTextContent('Balances · TransferKeepAlive');
  });

  it('shows the Source row only for proxied operations', () => {
    const { rerender } = render(<OperationDetails operation={baseOperation} account={multisigAccount} />);
    expect(screen.queryByTestId('row-operation.details.source')).toBeNull();

    rerender(
      <OperationDetails operation={{ ...baseOperation, proxiedAccountId: proxiedId }} account={multisigAccount} />,
    );
    expect(screen.getByTestId('row-operation.details.source')).toHaveTextContent(proxiedId);
  });

  it('for a flexible multisig the Multisig row is the backing multisig and Source is the proxied account', () => {
    render(<OperationDetails operation={baseOperation} account={flexibleAccount} />);

    expect(screen.getByTestId('row-operation.details.multisig')).toHaveTextContent(multisigId);
    expect(screen.getByTestId('row-operation.details.source')).toHaveTextContent(proxiedId);
  });

  it('renders the Amount row only when an amount is provided', () => {
    const { rerender } = render(<OperationDetails operation={baseOperation} account={multisigAccount} />);
    expect(screen.queryByTestId('row-operation.details.amount')).toBeNull();

    rerender(
      <OperationDetails
        operation={baseOperation}
        account={multisigAccount}
        amount={{ value: '320', asset: { symbol: 'DOT' } as never }}
      />,
    );
    expect(screen.getByTestId('row-operation.details.amount')).toHaveTextContent('320');
  });

  it('omits the Operation type row when the call is unknown', () => {
    render(
      <OperationDetails
        operation={{ ...baseOperation, transaction: null, section: null, method: null }}
        account={multisigAccount}
      />,
    );
    expect(screen.queryByTestId('row-operation.details.operationType')).toBeNull();
  });
});
