import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { type Asset } from '@/shared/core';
import { type Validator } from '@/shared/core/types/validator';

import { ValidatorsModal } from './ValidatorsModal';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Staking/components/ValidatorsModal', () => {
  const defaultProps = {
    isOpen: true,
    amount: '1000000000000',
    asset: { symbol: 'DOT', precision: 10 } as Asset,
    identities: {},
    selectedValidators: [
      { address: '12QkLhnKL5vXsa7e74CC45RUSqA5fRqc8rKHzXYZb82ppZap' },
      { address: 'EGSgCCMmg5vePv611bmJpgdy7CaXaHayqPH8XwgD1jetWjN' },
      { address: '5H46Nxu6sJvTYe4rSUxYTUU6pG5dh6jZq66je2g7SLE3RCj6' },
    ] as Validator[],
    notSelectedValidators: [],
    onClose: () => {},
  };

  test('should render component', async () => {
    render(<ValidatorsModal {...defaultProps} />);

    const title = await screen.findByText('staking.confirmation.validatorsTitle');
    expect(title).toBeInTheDocument();
  });

  test('should render all validators', async () => {
    render(<ValidatorsModal {...defaultProps} />);

    const items = await screen.findAllByTestId('validator');
    expect(items).toHaveLength(defaultProps.selectedValidators.length);
  });
});
