import { render, screen } from '@testing-library/react';

import { Validator } from '@renderer/shared/core/types/validator';
import ValidatorsModal from './ValidatorsModal';
import type { Asset } from '@renderer/shared/core';

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/entities/wallet', () => ({
  AddressWithExplorers: ({ address }: { address: string }) => <span data-testid="validator">{address}</span>,
}));

describe('pages/Staking/components/ValidatorsModal', () => {
  const defaultProps = {
    isOpen: true,
    amount: '1000000000000',
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    selectedValidators: [
      {
        address: '12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap',
        identity: {
          subName: 'subName',
          parent: { name: 'parent', address: '0x123' },
        },
      },
      {
        address: 'EGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN',
        identity: {
          subName: 'subName',
          parent: { name: 'parent', address: '0x123' },
        },
      },
      {
        address: '5H46Nxu6sJvTYe4rSUxYTUU6pG5dh6jZq66je2g7SLE3RCj6',
        identity: {
          subName: 'subName',
          parent: { name: 'parent', address: '0x123' },
        },
      },
    ] as Validator[],
    notSelectedValidators: [],
    onClose: () => {},
  };

  test('should render component', () => {
    render(<ValidatorsModal {...defaultProps} />);

    const title = screen.getByText('staking.confirmation.validatorsTitle');
    expect(title).toBeInTheDocument();
  });

  test('should render all validators', () => {
    render(<ValidatorsModal {...defaultProps} />);

    const items = screen.getAllByTestId('validator');
    expect(items).toHaveLength(defaultProps.selectedValidators.length);
  });
});
