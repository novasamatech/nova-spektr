import { render, screen } from '@testing-library/react';

import Address from './Address';

describe('ui/Address', () => {
  test('should render component', () => {
    const address = '0x5DCXVewfw123';
    render(<Address address={address} full />);

    const addressValue = screen.getByText(address);
    expect(addressValue).toBeInTheDocument();
  });
});
