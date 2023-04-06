import { render, screen } from '@testing-library/react';

import { Validator } from '@renderer/domain/validator';
import { Asset } from '@renderer/domain/asset';
import ValidatorsModal from './ValidatorsModal';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/components/ValidatorsModal', () => {
  const defaultProps = {
    isOpen: true,
    amount: '1000000000000',
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    validators: [
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
    onClose: () => {},
  };

  test('should render component', () => {
    render(<ValidatorsModal {...defaultProps} />);

    const title = screen.getByText('staking.confirmation.yourValidators');
    const header = screen.queryByRole('rowheader');
    expect(title).toBeInTheDocument();
    expect(header).not.toBeInTheDocument();
  });

  test('should render all validators', () => {
    render(<ValidatorsModal {...defaultProps} />);

    const items = screen.getAllByRole('row');
    expect(items).toHaveLength(4);
  });
});
