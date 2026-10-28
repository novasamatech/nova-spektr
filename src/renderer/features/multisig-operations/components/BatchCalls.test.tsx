import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { BatchCalls } from './BatchCalls';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
  }),
}));

vi.mock('@/shared/ui', () => ({
  DetailRow: ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  ),
  FootnoteText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: ({ value }: { value: string }) => <span>amount:{value}</span>,
}));

vi.mock('@/widgets/NameResolver', () => ({
  NamedAccount: ({ accountId }: { accountId: AccountId }) => <span>account:{accountId}</span>,
}));

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const ALICE_ACCOUNT_ID = '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const BOB_ACCOUNT_ID = '0x8eaf04151687736326c9fea17e25fc5287613693c912909cb226aa4794f26a48';

const chain = {
  chainId: '0x00',
  assets: [{ assetId: 0, symbol: 'DOT', precision: 10, type: 'native' }],
} as unknown as Chain;

const createCall = (
  type: TransactionType | undefined,
  section: string,
  method: string,
  args: Record<string, unknown> = {},
) => ({ type, section, method, args }) as unknown as DecodedTransaction;

const createBatch = (transactions: DecodedTransaction[]) =>
  createCall(TransactionType.BATCH_ALL, 'utility', 'batchAll', { transactions });

describe('BatchCalls', () => {
  it('renders nothing for a single call', () => {
    const { container } = render(
      <BatchCalls transaction={createCall(TransactionType.TRANSFER, 'balances', 'transferKeepAlive')} chain={chain} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('lists every call of a batch with its amount and account', () => {
    const batch = createBatch([
      createCall(TransactionType.TRANSFER, 'balances', 'transferKeepAlive', { dest: BOB, value: '100', assetId: '0' }),
      createCall(TransactionType.ADD_PROXY, 'proxy', 'addProxy', { delegate: ALICE, proxyType: 'Any' }),
      createCall(undefined, 'system', 'remark', { remark: '0x00' }),
    ]);

    render(<BatchCalls transaction={batch} chain={chain} />);

    const items = within(screen.getByTestId('batch-calls')).getAllByRole('listitem');

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('1. Balances: Transfer keep alive');
    expect(items[0]).toHaveTextContent('amount:100');
    expect(items[0]).toHaveTextContent(`account:${BOB_ACCOUNT_ID}`);
    expect(items[1]).toHaveTextContent('2. Proxy: Add proxy');
    expect(items[1]).toHaveTextContent(`account:${ALICE_ACCOUNT_ID}`);
    expect(items[2]).toHaveTextContent('3. System: Remark');
  });

  it('shows the proxy type of proxy management calls', () => {
    const batch = createBatch([
      createCall(TransactionType.ADD_PROXY, 'proxy', 'addProxy', { delegate: ALICE, proxyType: 'Any' }),
      createCall(TransactionType.REMOVE_PROXY, 'proxy', 'removeProxy', { delegate: BOB, proxyType: 'Staking' }),
      createCall(TransactionType.CREATE_PURE_PROXY, 'proxy', 'createPure', { proxyType: 'NonTransfer' }),
      createCall(TransactionType.TRANSFER, 'balances', 'transferKeepAlive', { dest: BOB, value: '1' }),
    ]);

    render(<BatchCalls transaction={batch} chain={chain} />);

    const items = within(screen.getByTestId('batch-calls')).getAllByRole('listitem');

    expect(items[0]).toHaveTextContent('operation.details.batchCallProxyType:{"proxyType":"Any"}');
    expect(items[1]).toHaveTextContent('operation.details.batchCallProxyType:{"proxyType":"Staking"}');
    expect(items[2]).toHaveTextContent('operation.details.batchCallProxyType:{"proxyType":"NonTransfer"}');
    expect(items[3]).not.toHaveTextContent('batchCallProxyType');
  });

  it('stops expanding nested batches past the depth cap', () => {
    const transfer = createCall(TransactionType.TRANSFER, 'balances', 'transferKeepAlive', { dest: BOB, value: '7' });
    let batch = createBatch([transfer]);
    // 10 nested levels under the top batch; only 8 levels of lists are rendered.
    for (let level = 0; level < 10; level++) {
      batch = createBatch([batch]);
    }

    render(<BatchCalls transaction={batch} chain={chain} />);

    const list = screen.getByTestId('batch-calls');

    expect(list).toHaveTextContent('1.1.1.1.1.1.1.1. Utility: Batch all');
    expect(list).not.toHaveTextContent('1.1.1.1.1.1.1.1.1.');
    expect(screen.getAllByText('operation.details.batchCallsHidden:{"count":1}')).toHaveLength(1);
    expect(list).not.toHaveTextContent('amount:7');
  });

  it('lists the calls of a nested batch under their parent', () => {
    const batch = createBatch([
      createCall(TransactionType.UNDELEGATE, 'convictionVoting', 'undelegate', { class: 0 }),
      createCall(TransactionType.DELEGATE, 'convictionVoting', 'delegate', { target: BOB, balance: '10' }),
      createBatch([
        createCall(TransactionType.ADD_PROXY, 'proxy', 'addProxy', { delegate: ALICE, proxyType: 'Any' }),
        createBatch([createCall(TransactionType.TRANSFER, 'balances', 'transferKeepAlive', { dest: BOB, value: '7' })]),
      ]),
    ]);

    render(<BatchCalls transaction={batch} chain={chain} />);

    const list = screen.getByTestId('batch-calls');
    const topLevelItems = Array.from(list.children);

    expect(screen.getByText('operation.details.batchCalls').parentElement).toHaveTextContent('3');
    expect(topLevelItems).toHaveLength(3);
    expect(topLevelItems[2]).toHaveTextContent('3. Utility: Batch all');
    expect(topLevelItems[2]).toHaveTextContent('3.1. Proxy: Add proxy');
    expect(topLevelItems[2]).toHaveTextContent(`account:${ALICE_ACCOUNT_ID}`);
    expect(topLevelItems[2]).toHaveTextContent('operation.details.batchCallProxyType:{"proxyType":"Any"}');
    expect(topLevelItems[2]).toHaveTextContent('3.2. Utility: Batch all');
    expect(topLevelItems[2]).toHaveTextContent('3.2.1. Balances: Transfer keep alive');
    expect(topLevelItems[2]).toHaveTextContent('amount:7');
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  });

  it('lists calls of a proxied batch', () => {
    const batch = createBatch([
      createCall(TransactionType.BOND, 'staking', 'bond', { value: '1' }),
      createCall(TransactionType.NOMINATE, 'staking', 'nominate', { targets: [] }),
    ]);
    const proxied = createCall(TransactionType.PROXY, 'proxy', 'proxy', { real: ALICE, transaction: batch });

    render(<BatchCalls transaction={proxied} chain={chain} />);

    expect(within(screen.getByTestId('batch-calls')).getAllByRole('listitem')).toHaveLength(2);
  });
});
