import { render, screen, within } from '@testing-library/react';
import { type ReactNode } from 'react';

import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { type AccountId } from '@/shared/polkadotjs-schemas';

import { BatchCalls } from './BatchCalls';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
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
