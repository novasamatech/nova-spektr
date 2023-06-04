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
  const spyGoBack = jest.fn();

  const defaultProps = {
    api: {} as ApiPromise,
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    addressPrefix: 0,
    transaction: {} as Transaction,
    accounts: [] as AccountDS[],
    onResult: spyResult,
    onGoBack: spyGoBack,
  };

  test('should render component', () => {
    render(<Confirmation {...defaultProps} />);

    const signButton = screen.getByText('staking.confirmation.signButton');
    expect(signButton).toBeInTheDocument();
  });

  test('should call onResult and onGoBack', () => {
    render(<Confirmation {...defaultProps} />);

    const signButton = screen.getByText('staking.confirmation.signButton');
    const backButton = screen.getByText('staking.confirmation.backButton');
    signButton.click();
    backButton.click();

    expect(spyResult).toBeCalled();
  });
});
