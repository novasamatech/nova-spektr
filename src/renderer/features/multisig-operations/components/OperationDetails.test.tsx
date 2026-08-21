import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type MultisigOperation } from '@/domains/network';

import { OperationDetails } from './OperationDetails';

const stores = vi.hoisted(() => ({
  chainsStore: Symbol('chains'),
}));
const chainsFixture = vi.hoisted(() => ({ current: { '0x00': { chainId: '0x00', addressPrefix: 0 } } as unknown }));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => {
    if (store === stores.chainsStore) return chainsFixture.current;

    return undefined;
  },
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatDate: () => '30 Apr 2026, 13:19',
  }),
}));

vi.mock('@/shared/ui', () => ({
  DETAIL_ROW_ACCOUNT_ICON_SIZE: 20,
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

// The real `@/entities/transaction` barrel drags in QR/camera UI modules that
// don't survive jsdom, so this stub reimplements `findCoreTransaction`'s
// proxy-unwrap behaviour faithfully instead of importing the real module.
vi.mock('@/entities/transaction', () => ({
  findCoreTransaction: (tx: { type?: string; section: string; method: string; args?: unknown } | null) =>
    tx?.type === 'proxy' ? (tx.args as { transaction: unknown }).transaction : tx,
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({
    accountId,
    title,
    wallet,
    walletNameAs,
  }: {
    accountId: AccountId;
    title?: string;
    wallet?: unknown;
    walletNameAs?: string;
  }) => (
    <span data-title={title} data-wallet={wallet ? 'yes' : undefined} data-wallet-as={walletNameAs}>
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

describe('OperationDetails', () => {
  it('renders the depositor with its wallet as a fallback name, never as an override', () => {
    render(<OperationDetails operation={baseOperation} />);

    const row = screen.getByTestId('row-operation.details.depositor');
    expect(row).toHaveTextContent(depositor);
    expect(row.querySelector('[data-title]')).toBeNull();
    // No wallet is handed over: NamedAccount looks the owning wallet up itself.
    expect(row.querySelector('[data-wallet-as="fallback"]')).not.toBeNull();
  });

  it('renders the multisig and source rows in fallback mode too', () => {
    render(<OperationDetails operation={{ ...baseOperation, proxiedAccountId: proxiedId }} />);

    for (const label of ['row-operation.details.multisig', 'row-operation.details.source']) {
      const row = screen.getByTestId(label);
      expect(row.querySelector('[data-title]')).toBeNull();
      expect(row.querySelector('[data-wallet-as="fallback"]')).not.toBeNull();
    }
  });

  it('renders Date & Time first, then Depositor, Multisig, slot content, Operation type', () => {
    render(
      <OperationDetails operation={baseOperation}>
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

  it('omits the Source row for a non-proxied operation', () => {
    render(<OperationDetails operation={baseOperation} />);
    expect(screen.queryByTestId('row-operation.details.source')).toBeNull();
  });

  it('shows the Multisig row from multisigAccountId and the Source row from proxiedAccountId', () => {
    render(<OperationDetails operation={{ ...baseOperation, proxiedAccountId: proxiedId }} />);

    expect(screen.getByTestId('row-operation.details.multisig')).toHaveTextContent(multisigId);
    expect(screen.getByTestId('row-operation.details.source')).toHaveTextContent(proxiedId);
  });

  it('renders the Amount row only when an amount is provided', () => {
    const { rerender } = render(<OperationDetails operation={baseOperation} />);
    expect(screen.queryByTestId('row-operation.details.amount')).toBeNull();

    rerender(
      <OperationDetails operation={baseOperation} amount={{ value: '320', asset: { symbol: 'DOT' } as never }} />,
    );
    expect(screen.getByTestId('row-operation.details.amount')).toHaveTextContent('320');
  });

  it('omits the Operation type row when the call is unknown', () => {
    render(<OperationDetails operation={{ ...baseOperation, transaction: null, section: null, method: null }} />);
    expect(screen.queryByTestId('row-operation.details.operationType')).toBeNull();
  });

  it('unwraps a proxy transaction so the chip names the inner call', () => {
    const proxyOperation = {
      ...baseOperation,
      section: 'proxy',
      method: 'proxy',
      transaction: {
        type: TransactionType.PROXY,
        section: 'proxy',
        method: 'proxy',
        args: { transaction: { section: 'balances', method: 'transferKeepAlive' } },
      },
    } as unknown as MultisigOperation;

    render(<OperationDetails operation={proxyOperation} />);

    expect(screen.getByTestId('row-operation.details.operationType')).toHaveTextContent('Balances · TransferKeepAlive');
  });

  it('renders Depositor and Multisig rows even when the chain is unknown', () => {
    chainsFixture.current = {};
    try {
      render(<OperationDetails operation={baseOperation} />);
      expect(screen.getByTestId('row-operation.details.depositor')).toHaveTextContent(depositor);
      expect(screen.getByTestId('row-operation.details.multisig')).toHaveTextContent(multisigId);
    } finally {
      chainsFixture.current = { '0x00': { chainId: '0x00', addressPrefix: 0 } };
    }
  });
});
