import { ApiPromise } from '@polkadot/api';
import { render, screen } from '@testing-library/react';

import { Asset } from '@renderer/entities/asset';
import { Transaction } from '@renderer/entities/transaction';
import { AccountDS } from '@renderer/shared/api/storage';
import { Confirmation } from './Confirmation';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/multisig', () => ({
  useMultisigTx: jest.fn().mockReturnValue({
    getMultisigTxs: jest.fn().mockReturnValue([]),
  }),
}));

jest.mock('@renderer/entities/account', () => ({
  ...jest.requireActual('@renderer/entities/account'),
  AddressWithExplorers: ({ address }: any) => <span data-testid="address">{address}</span>,
}));

describe('pages/Staking/components/Confirmation', () => {
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

    expect(spyGoBack).toBeCalled();
    expect(spyResult).toBeCalled();
  });
});
