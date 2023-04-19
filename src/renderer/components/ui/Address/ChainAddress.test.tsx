import { render, screen } from '@testing-library/react';

import ChainAddress from './ChainAddress';

describe('ui/Address', () => {
  const address = '15UHvPeMjYLvMLqh6bWLxAP3MbqjjsMXFWToJKCijzGPM3p9';

  test('should render component', () => {
    render(<ChainAddress address={address} />);

    const addressValue = screen.getByText(address);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<ChainAddress type="short" address={address} />);

    const elipsis = screen.getByText('15UHvP...GPM3p9');
    expect(elipsis).toBeInTheDocument();
  });
});
