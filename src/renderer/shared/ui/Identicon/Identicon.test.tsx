import { render, screen } from '@testing-library/react';

import { TEST_ADDRESS } from '@shared/lib/utils';
import Identicon from './Identicon';

describe('ui/Identicon', () => {
  const address = TEST_ADDRESS;

  test('should render component', () => {
    render(<Identicon address={address} />);

    const text = screen.getByTestId(`identicon-${address}`);
    expect(text).toBeInTheDocument();
  });
});
