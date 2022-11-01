import { render, screen } from '@testing-library/react';

import Address from './Address';

describe('ui/Address', () => {
  const address = '15UHvPeMjYLvMLqh6bWLxAP3MbqjjsMXFWToJKCijzGPM3p9';

  test('should render component', () => {
    render(<Address address={address} />);

    const addressValue = screen.getByText(address);
    expect(addressValue).toBeInTheDocument();
  });

  test('should render short component', () => {
    render(<Address type="short" address={address} />);

    const elipsis = screen.getByText('15UHvP...GPM3p9')
    expect(elipsis).toBeInTheDocument();
  });
});
