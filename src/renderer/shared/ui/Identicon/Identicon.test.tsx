import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS } from '@renderer/shared/lib/utils';
import { SigningType } from '@renderer/entities/wallet';
import Identicon from './Identicon';

describe('ui/Identicon', () => {
  const address = TEST_ADDRESS;

  test('should render component', () => {
    render(<Identicon address={address} />);

    const text = screen.getByTestId(`identicon-${address}`);
    expect(text).toBeInTheDocument();
  });

  test('should render sign badge', () => {
    render(<Identicon address={address} signType={SigningType.PARITY_SIGNER} />);

    const text = screen.getByTestId(`identicon-${address}`);
    const badge = screen.getByRole('img');
    expect(text).toBeInTheDocument();
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('src', 'paritySignerBg.svg');
  });
});
