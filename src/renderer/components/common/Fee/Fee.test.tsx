import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { Balance } from '@renderer/components/ui';
import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import Fee from './Fee';

jest.mock('@renderer/components/ui');

jest.mock('@renderer/services/transaction/transactionService', () => ({
  useTransaction: jest.fn().mockReturnValue({
    getTransactionFee: jest.fn().mockImplementation((value: any) => value.args.value),
  }),
}));

describe('components/Fee', () => {
  const asset = { symbol: 'DOT', precision: 10 } as Asset;
  const tx = {
    type: 'transfer',
    chainId: '0x123',
    address: '111',
    args: { value: '21031239', dest: '5GmedEVixRJoE8TjMePLqz7DnnQG1d5517sXdiAvAF2t7EYW' },
  } as Transaction;

  beforeAll(() => {
    (Balance as jest.Mock).mockImplementation(({ value }: any) => <span>{value}</span>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(<Fee api={{} as ApiPromise} asset={asset} transaction={tx} />);
    });

    const amount = screen.getByText(tx.args.value);
    const ticker = screen.getByText(asset.symbol);
    expect(amount).toBeInTheDocument();
    expect(ticker).toBeInTheDocument();
  });
});
