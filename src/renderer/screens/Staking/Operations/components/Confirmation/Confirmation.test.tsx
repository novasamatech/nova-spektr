import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/domain/asset';
import { Transaction } from '@renderer/domain/transaction';
import { AccountDS } from '@renderer/services/storage';
import { Confirmation } from './Confirmation';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock(
  '../TransactionInfo/TransactionInfo',
  () =>
    ({ children }: any) =>
      children,
);

describe('screens/Staking/components/Confirmation', () => {
  const spyResult = jest.fn();
  const spyAddToQueue = jest.fn();

  const defaultProps = {
    api: {} as ApiPromise,
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    addressPrefix: 0,
    transaction: {} as Transaction,
    accounts: [] as AccountDS[],
    onResult: spyResult,
    onAddToQueue: spyAddToQueue,
  };

  test('should render component', () => {
    render(<Confirmation {...defaultProps} />);

    const signButton = screen.getByText('staking.confirmation.signButton');
    // const queueButton = screen.getByText('staking.confirmation.queueButton');
    expect(signButton).toBeInTheDocument();
    // expect(queueButton).toBeInTheDocument();
  });

  test('should call onResult', () => {
    render(<Confirmation {...defaultProps} />);

    const signButton = screen.getByText('staking.confirmation.signButton');
    signButton.click();

    expect(spyResult).toBeCalled();
  });

  // TODO: uncomment after adding Queue
  // test('should call onAddToQueue', () => {
  //   render(<Confirmation {...defaultProps} />);
  //
  //   const addToQueue = screen.getByText('staking.confirmation.queueButton');
  //   addToQueue.click();
  //
  //   expect(spyAddToQueue).toBeCalled();
  // });
});
